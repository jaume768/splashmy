from rest_framework import serializers
from django.conf import settings
from .models import Image, ProcessedImage, ImageTag, ImageTagAssignment
from .services import aws_image_service, image_processing_service


class ImageTagSerializer(serializers.ModelSerializer):
    """Serializer for image tags"""
    
    class Meta:
        model = ImageTag
        fields = ['id', 'name', 'slug', 'description']
        read_only_fields = ['slug']


class ImageUploadSerializer(serializers.ModelSerializer):
    """Serializer for image uploads with content moderation"""
    
    original_image = serializers.ImageField(write_only=True)
    tags = serializers.ListField(
        child=serializers.CharField(max_length=50),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Image
        fields = [
            'id', 'title', 'description', 'original_image', 'tags',
            'status', 'is_content_safe', 'created_at'
        ]
        read_only_fields = ['id', 'status', 'is_content_safe', 'created_at']
    
    def validate_original_image(self, value):
        """Validate image file"""
        if not aws_image_service.validate_image_format(value):
            raise serializers.ValidationError(
                "Invalid image format or size. Allowed formats: " + 
                ", ".join(settings.ALLOWED_IMAGE_EXTENSIONS) +
                f". Max size: {settings.MAX_UPLOAD_SIZE // (1024*1024)}MB"
            )
        return value
    
    def create(self, validated_data):
        """Create image with content moderation and S3 upload"""
        image_file = validated_data.pop('original_image')
        tags_data = validated_data.pop('tags', [])
        user = self.context['request'].user
        
        # Check user's daily upload limit
        today_uploads = Image.objects.filter(
            user=user,
            created_at__date=timezone.now().date()
        ).count()
        
        max_uploads = (settings.DAILY_UPLOAD_LIMIT_PREMIUM 
                      if user.is_premium 
                      else settings.DAILY_UPLOAD_LIMIT_FREE)
        
        if today_uploads >= max_uploads:
            raise serializers.ValidationError(
                f"Daily upload limit reached ({max_uploads} images)"
            )
        
        # Optimize image
        optimized_image = image_processing_service.optimize_image(image_file)
        
        # Content moderation
        is_safe, moderation_result = aws_image_service.moderate_content(optimized_image)
        
        if not is_safe:
            raise serializers.ValidationError(
                "Image contains inappropriate content and cannot be uploaded."
            )
        
        # Extract metadata
        metadata = image_processing_service.extract_image_metadata(optimized_image)
        
        # Create image instance
        image = Image.objects.create(
            user=user,
            original_filename=image_file.name,
            file_size=optimized_image.size,
            width=metadata.get('width', 0),
            height=metadata.get('height', 0),
            format=metadata.get('format', ''),
            is_content_safe=is_safe,
            moderation_result=moderation_result,
            moderation_checked_at=timezone.now(),
            **validated_data
        )
        
        # Upload to S3
        s3_key = f"images/uploads/{user.id}/{image.id}.jpg"
        s3_url = aws_image_service.upload_to_s3(optimized_image, s3_key)
        
        if s3_url:
            image.s3_key = s3_key
            image.s3_url = s3_url
            image.s3_bucket = settings.AWS_STORAGE_BUCKET_NAME
            image.status = 'uploaded'
        else:
            image.status = 'failed'
            image.error_message = "Failed to upload to S3"
        
        image.save()
        
        # Add tags
        for tag_name in tags_data:
            tag, created = ImageTag.objects.get_or_create(
                name=tag_name.lower(),
                defaults={'slug': tag_name.lower().replace(' ', '-')}
            )
            ImageTagAssignment.objects.create(
                image=image,
                tag=tag,
                created_by=user
            )
        
        return image


class ImageSerializer(serializers.ModelSerializer):
    """Serializer for image display"""
    
    tags = serializers.SerializerMethodField()
    user_email = serializers.CharField(source='user.email', read_only=True)
    processed_count = serializers.SerializerMethodField()
    signed_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Image
        fields = [
            'id', 'title', 'description', 'user_email', 'original_filename',
            'file_size', 'width', 'height', 'format', 'status',
            'is_content_safe', 'created_at', 'updated_at', 'is_public',
            'tags', 'processed_count', 'signed_url'
        ]
    
    def get_tags(self, obj):
        """Get image tags"""
        return [
            assignment.tag.name 
            for assignment in obj.tag_assignments.select_related('tag')
        ]
    
    def get_processed_count(self, obj):
        """Get count of processed versions"""
        return obj.processed_versions.count()
    
    def get_signed_url(self, obj):
        """Get signed URL for secure access"""
        if obj.s3_key:
            return aws_image_service.generate_presigned_url(obj.s3_key)
        return None


class ProcessedImageSerializer(serializers.ModelSerializer):
    """Serializer for processed/styled images"""
    
    original_image_title = serializers.CharField(source='original_image.title', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    signed_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ProcessedImage
        fields = [
            'id', 'original_image', 'original_image_title', 'user_email',
            'style_name', 'style_prompt', 'processing_time',
            'openai_request_id', 'openai_model_used', 'processing_parameters',
            'similarity_score', 'user_rating', 'is_favorite',
            'download_count', 'created_at', 'signed_url'
        ]
        read_only_fields = [
            'id', 'processing_time', 'openai_request_id', 'openai_model_used',
            'similarity_score', 'download_count', 'created_at'
        ]
    
    def get_signed_url(self, obj):
        """Get signed URL for processed image"""
        if hasattr(obj, 'processed_image') and obj.processed_image:
            # Extract S3 key from the processed image field
            s3_key = str(obj.processed_image)
            return aws_image_service.generate_presigned_url(s3_key)
        return None


class ImageModerationSerializer(serializers.ModelSerializer):
    """Serializer for image moderation results (admin only)"""
    
    class Meta:
        model = Image
        fields = [
            'id', 'is_content_safe', 'moderation_result',
            'moderation_checked_at', 'status'
        ]
        read_only_fields = ['moderation_checked_at']
