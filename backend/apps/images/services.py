import boto3
import logging
from typing import Dict, List, Tuple, Optional
from django.conf import settings
from django.core.files.uploadedfile import InMemoryUploadedFile
from botocore.exceptions import ClientError
from PIL import Image
import io

logger = logging.getLogger(__name__)


class AWSImageService:
    """Service for handling AWS S3 and Rekognition operations"""
    
    def __init__(self):
        self.s3_client = None
        self.rekognition_client = None
        self.use_s3 = getattr(settings, 'USE_S3_STORAGE', False)
        self.use_moderation = getattr(settings, 'USE_CONTENT_MODERATION', False)
        
        # Only initialize AWS clients if we're using S3 storage
        if self.use_s3 and settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME
            )
        
        # Only initialize Rekognition if we're using content moderation
        if self.use_moderation and settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            self.rekognition_client = boto3.client(
                'rekognition',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REKOGNITION_REGION
            )
    
    def validate_image_format(self, image_file: InMemoryUploadedFile) -> bool:
        """Validate image format and size"""
        try:
            # Check file extension
            file_extension = image_file.name.split('.')[-1].lower()
            if file_extension not in settings.ALLOWED_IMAGE_EXTENSIONS:
                logger.warning(f"Invalid file extension: {file_extension}")
                return False
            
            # Check file size
            if image_file.size > settings.MAX_UPLOAD_SIZE:
                logger.warning(f"File too large: {image_file.size} bytes")
                return False
            
            # Validate image can be opened
            image_file.seek(0)
            with Image.open(image_file) as img:
                img.verify()
            image_file.seek(0)
            
            return True
            
        except Exception as e:
            logger.error(f"Image validation failed: {e}")
            return False
    
    def moderate_content(self, image_file: InMemoryUploadedFile) -> Tuple[bool, Dict]:
        """
        Moderate image content using Amazon Rekognition
        Returns: (is_safe, moderation_result)
        """
        # Skip moderation in development environment
        if not self.use_moderation:
            logger.info("Content moderation disabled for development environment")
            return True, {"message": "Content moderation disabled in development mode"}
        
        if not self.rekognition_client:
            logger.warning("Rekognition client not available, skipping moderation")
            return True, {"message": "Content moderation skipped - AWS not configured"}
        
        try:
            image_file.seek(0)
            image_bytes = image_file.read()
            image_file.seek(0)
            
            response = self.rekognition_client.detect_moderation_labels(
                Image={'Bytes': image_bytes},
                MinConfidence=settings.CONTENT_MODERATION_CONFIDENCE_THRESHOLD
            )
            
            moderation_labels = response.get('ModerationLabels', [])
            
            # Check for inappropriate content
            unsafe_labels = []
            for label in moderation_labels:
                label_name = label['Name']
                confidence = label['Confidence']
                
                # Allow certain labels if they're in the allowed list
                if label_name not in settings.ALLOWED_MODERATION_LABELS:
                    unsafe_labels.append({
                        'name': label_name,
                        'confidence': confidence,
                        'parent_name': label.get('ParentName', '')
                    })
            
            is_safe = len(unsafe_labels) == 0
            
            moderation_result = {
                'is_safe': is_safe,
                'detected_labels': moderation_labels,
                'unsafe_labels': unsafe_labels,
                'confidence_threshold': settings.CONTENT_MODERATION_CONFIDENCE_THRESHOLD
            }
            
            if not is_safe:
                logger.warning(f"Content moderation failed: {unsafe_labels}")
            
            return is_safe, moderation_result
            
        except ClientError as e:
            logger.error(f"AWS Rekognition error: {e}")
            return False, {"error": str(e)}
        except Exception as e:
            logger.error(f"Content moderation error: {e}")
            return False, {"error": str(e)}
    
    def upload_to_s3(self, image_file: InMemoryUploadedFile, s3_key: str) -> Optional[str]:
        """
        Upload image to S3 (production) or local storage (development)
        Returns: URL or local path
        """
        # In development, save to local media folder
        if not self.use_s3:
            return self._save_to_local_storage(image_file, s3_key)
        
        if not self.s3_client:
            logger.warning("S3 client not available, falling back to local storage")
            return self._save_to_local_storage(image_file, s3_key)
        
        try:
            image_file.seek(0)
            
            # Upload file to S3
            self.s3_client.upload_fileobj(
                image_file,
                settings.AWS_STORAGE_BUCKET_NAME,
                s3_key,
                ExtraArgs={
                    'ContentType': image_file.content_type,
                    'ACL': settings.AWS_DEFAULT_ACL,
                    'CacheControl': 'max-age=86400'
                }
            )
            
            # Generate URL
            if settings.AWS_S3_CUSTOM_DOMAIN:
                s3_url = f"https://{settings.AWS_S3_CUSTOM_DOMAIN}/{s3_key}"
            else:
                s3_url = f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{s3_key}"
            
            logger.info(f"Successfully uploaded to S3: {s3_key}")
            return s3_url
            
        except ClientError as e:
            logger.error(f"S3 upload failed: {e}")
            return None
        except Exception as e:
            logger.error(f"Upload error: {e}")
            return None
    
    def _save_to_local_storage(self, image_file: InMemoryUploadedFile, s3_key: str) -> Optional[str]:
        """Save image to local media folder for development"""
        try:
            import os
            from django.conf import settings
            
            # Create local path based on s3_key
            local_path = os.path.join(settings.MEDIA_ROOT, s3_key)
            local_dir = os.path.dirname(local_path)
            
            # Create directory if it doesn't exist
            os.makedirs(local_dir, exist_ok=True)
            
            # Save file
            image_file.seek(0)
            with open(local_path, 'wb') as f:
                f.write(image_file.read())
            image_file.seek(0)
            
            # Return local URL
            relative_path = s3_key
            local_url = f"{settings.MEDIA_URL}{relative_path}"
            
            logger.info(f"Successfully saved to local storage: {local_path}")
            return local_url
            
        except Exception as e:
            logger.error(f"Local storage save failed: {e}")
            return None
    
    def delete_from_s3(self, s3_key: str) -> bool:
        """Delete file from S3 or local storage"""
        # In development, delete from local storage
        if not self.use_s3:
            return self._delete_from_local_storage(s3_key)
        
        if not self.s3_client:
            return self._delete_from_local_storage(s3_key)
        
        try:
            self.s3_client.delete_object(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key=s3_key
            )
            logger.info(f"Successfully deleted from S3: {s3_key}")
            return True
            
        except ClientError as e:
            logger.error(f"S3 delete failed: {e}")
            return False
        except Exception as e:
            logger.error(f"Delete error: {e}")
            return False
    
    def _delete_from_local_storage(self, s3_key: str) -> bool:
        """Delete file from local storage"""
        try:
            import os
            from django.conf import settings
            
            local_path = os.path.join(settings.MEDIA_ROOT, s3_key)
            
            if os.path.exists(local_path):
                os.remove(local_path)
                logger.info(f"Successfully deleted from local storage: {local_path}")
                return True
            else:
                logger.warning(f"File not found in local storage: {local_path}")
                return False
                
        except Exception as e:
            logger.error(f"Local storage delete failed: {e}")
            return False
    
    def generate_presigned_url(self, s3_key: str, expiration: int = 3600) -> Optional[str]:
        """Generate presigned URL for S3 or return local URL for development"""
        # In development, return local media URL
        if not self.use_s3:
            from django.conf import settings
            return f"{settings.MEDIA_URL}{s3_key}"
        
        if not self.s3_client:
            # Fallback to local URL
            from django.conf import settings
            return f"{settings.MEDIA_URL}{s3_key}"
        
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': settings.AWS_STORAGE_BUCKET_NAME, 'Key': s3_key},
                ExpiresIn=expiration
            )
            return url
            
        except ClientError as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            return None


class ImageProcessingService:
    """Service for image processing and optimization"""
    
    @staticmethod
    def optimize_image(image_file: InMemoryUploadedFile, max_width: int = 1920, max_height: int = 1080, quality: int = 85) -> InMemoryUploadedFile:
        """Optimize image size and quality"""
        try:
            image_file.seek(0)
            
            with Image.open(image_file) as img:
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')
                
                # Resize if needed
                if img.width > max_width or img.height > max_height:
                    img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
                
                # Save optimized image
                output = io.BytesIO()
                img.save(output, format='JPEG', quality=quality, optimize=True)
                output.seek(0)
                
                # Create new InMemoryUploadedFile
                optimized_file = InMemoryUploadedFile(
                    output,
                    'ImageField',
                    f"optimized_{image_file.name}",
                    'image/jpeg',
                    output.getbuffer().nbytes,
                    None
                )
                
                return optimized_file
                
        except Exception as e:
            logger.error(f"Image optimization failed: {e}")
            return image_file
    
    @staticmethod
    def extract_image_metadata(image_file: InMemoryUploadedFile) -> Dict:
        """Extract metadata from image"""
        try:
            image_file.seek(0)
            
            with Image.open(image_file) as img:
                metadata = {
                    'width': img.width,
                    'height': img.height,
                    'format': img.format,
                    'mode': img.mode,
                    'has_transparency': img.mode in ('RGBA', 'LA', 'P'),
                }
                
                # Extract EXIF data if available
                if hasattr(img, '_getexif') and img._getexif():
                    metadata['exif'] = dict(img._getexif())
                
                return metadata
                
        except Exception as e:
            logger.error(f"Metadata extraction failed: {e}")
            return {}


# Initialize services
aws_image_service = AWSImageService()
image_processing_service = ImageProcessingService()
