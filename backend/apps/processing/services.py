from openai import OpenAI
import base64
import io
import logging
import time
from typing import Dict, List, Tuple, Optional, Generator
from django.conf import settings
from django.core.files.uploadedfile import InMemoryUploadedFile
from PIL import Image
from apps.images.services import aws_image_service

logger = logging.getLogger(__name__)


class OpenAIImageService:
    """Service for OpenAI gpt-image-1 integration with content moderation"""
    
    def __init__(self):
        if not settings.OPENAI_API_KEY:
            logger.warning("OpenAI API key not configured")
            self.client = None
        else:
            # Modern OpenAI v1.x client initialization with explicit configuration
            print(f"Initializing OpenAI client...")
            try:
                self.client = OpenAI(
                    api_key=settings.OPENAI_API_KEY,
                    timeout=60.0,
                    max_retries=3
                )
                print(f"OpenAI client initialized successfully")
            except Exception as e:
                print(f"OpenAI client initialization failed: {e}")
                self.client = None
    
    def _validate_and_moderate_image(self, image_file: InMemoryUploadedFile) -> Tuple[bool, Dict]:
        """
        Validate and moderate image before sending to OpenAI
        Returns: (is_safe, moderation_result)
        """
        # Step 1: Basic validation
        if not aws_image_service.validate_image_format(image_file):
            return False, {"error": "Invalid image format or size"}
        
        # Step 2: Content moderation with Amazon Rekognition
        is_safe, moderation_result = aws_image_service.moderate_content(image_file)
        
        if not is_safe:
            logger.warning(f"Image failed content moderation: {moderation_result}")
            return False, {
                "error": "Image contains inappropriate content",
                "moderation_details": moderation_result
            }
        
        logger.info("Image passed content moderation, safe to send to OpenAI")
        return True, moderation_result
    
    def _prepare_image_for_openai(self, image_file: InMemoryUploadedFile) -> str:
        """Convert image to base64 for OpenAI API"""
        try:
            image_file.seek(0)
            image_data = image_file.read()
            image_file.seek(0)
            
            # Convert to base64
            base64_image = base64.b64encode(image_data).decode('utf-8')
            return base64_image
            
        except Exception as e:
            logger.error(f"Failed to prepare image for OpenAI: {e}")
            raise
    
    def generate_image(
        self,
        prompt: str,
        style_params: Dict = None,
        user_id: str = None
    ) -> Dict:
        """
        Generate image using OpenAI gpt-image-1
        
        Args:
            prompt: Text description for image generation
            style_params: Style-specific parameters
            user_id: User identifier for OpenAI monitoring
        
        Returns:
            Dict with generated image data or error
        """
        if not self.client:
            return {"error": "OpenAI client not configured"}
        
        try:
            # Prepare parameters for gpt-image-1
            params = {
                "model": "gpt-image-1",
                "prompt": prompt,
                "n": style_params.get("n", 1),
                "size": style_params.get("size", "auto"),
                "quality": style_params.get("quality", "auto"),
                "background": style_params.get("background", "auto"),
                "output_format": style_params.get("output_format", "png"),
                "output_compression": style_params.get("output_compression", 85),
                "moderation": style_params.get("moderation", "auto"),
                "stream": style_params.get("stream", False),
                "partial_images": style_params.get("partial_images", 0)
            }
            
            if user_id:
                params["user"] = str(user_id)
            
            logger.info(f"Generating image with OpenAI gpt-image-1: {params}")
            
            start_time = time.time()
            
            # Call OpenAI API
            if params["stream"]:
                return self._handle_streaming_generation(params)
            else:
                response = self.client.images.generate(**params)
                processing_time = time.time() - start_time
                
                return self._process_generation_response(response, processing_time)
                
        except Exception as e:
            logger.error(f"OpenAI image generation failed: {e}")
            return {
                "error": "Image generation failed",
                "details": str(e)
            }
    
    def edit_image(
        self,
        image_files: List[InMemoryUploadedFile],
        prompt: str,
        style_params: Dict = None,
        user_id: str = None
    ) -> Dict:
        """
        Edit image using OpenAI gpt-image-1
        
        Args:
            image_files: List of images to edit (only first image used)
            prompt: Text description for image editing
            style_params: Style-specific parameters
            user_id: User identifier for OpenAI monitoring
        
        Returns:
            Dict with edited image data or error
        """
        if not self.client:
            return {"error": "OpenAI client not configured"}
        
        try:
            # Validate and moderate images
            moderated_images = []
            for image_file in image_files:
                is_safe, moderation_result = self._validate_and_moderate_image(image_file)
                if not is_safe:
                    return {"error": "Image contains inappropriate content", "moderation": moderation_result}
                
                # Keep original file for OpenAI (no base64 conversion)
                moderated_images.append(image_file)
            
            # Only use first image (OpenAI limitation)
            image_file = moderated_images[0]
            image_file.seek(0)  # ¡MUY IMPORTANTE! Reset file pointer
            image_bytes = image_file.read()
            
            params = {
                "model": "gpt-image-1",
                "image": (image_file.name, image_bytes, image_file.content_type or "image/png"),
                "prompt": prompt,
                "n": style_params.get("n", 1),
                "size": style_params.get("size", "1024x1024"),
                "quality": style_params.get("quality", "standard"),
            }
            
            if user_id:
                params["user"] = str(user_id)
            
            print(f"🎨 Editing image with OpenAI gpt-image-1: {list(params.keys())}")
            print(f"📁 Image file type: {type(image_file)}")
            
            start_time = time.time()
            
            print(f"🚀 About to call OpenAI images.edit()...")
            response = self.client.images.edit(**params)
            processing_time = time.time() - start_time
            return self._process_edit_response(response, processing_time)
                
        except Exception as e:
            # 🔍 DEBUG: Print detailed error information
            print(f"\n🚨 OPENAI EDIT ERROR DEBUG 🚨")
            print(f"Error type: {type(e).__name__}")
            print(f"Error message: {str(e)}")
            print(f"Error details: {repr(e)}")
            
            # Try to get more details if it's an OpenAI error
            if hasattr(e, 'response'):
                print(f"Response status: {getattr(e.response, 'status_code', 'N/A')}")
                print(f"Response text: {getattr(e.response, 'text', 'N/A')}")
            
            import traceback
            print(f"Full traceback: {traceback.format_exc()}")
            print(f"🚨 END DEBUG 🚨\n")
            
            logger.error(f"OpenAI image editing failed: {e}")
            return {
                "error": "Image editing failed",
                "details": str(e)
            }
    
    def _process_generation_response(self, response, processing_time: float) -> Dict:
        """Process OpenAI generation response"""
        try:
            result = {
                "success": True,
                "processing_time": processing_time,
                "created": getattr(response, 'created', int(time.time())),
                "images": [],
                "usage": getattr(response, 'usage', {}),
                "background": getattr(response, 'background', None),
                "output_format": getattr(response, 'output_format', None),
                "quality": getattr(response, 'quality', None),
                "size": getattr(response, 'size', None)
            }
            
            # Process generated images (always b64_json for gpt-image-1)
            for image_data in response.data:
                if hasattr(image_data, 'b64_json'):
                    result["images"].append({
                        "b64_json": image_data.b64_json,
                        "format": result["output_format"]
                    })
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to process OpenAI response: {e}")
            return {
                "error": "Failed to process response",
                "details": str(e)
            }
    
    def _process_edit_response(self, response, processing_time: float) -> Dict:
        """Process OpenAI edit response"""
        return self._process_generation_response(response, processing_time)
    
    def _handle_streaming_generation(self, params: Dict) -> Generator[Dict, None, None]:
        """Handle streaming image generation"""
        try:
            stream = self.client.images.generate(**params)
            
            for chunk in stream:
                if chunk.type == "image_generation.partial_image":
                    yield {
                        "type": "partial_image",
                        "b64_json": chunk.b64_json,
                        "partial_image_index": chunk.partial_image_index,
                        "created_at": chunk.created_at,
                        "size": chunk.size,
                        "quality": chunk.quality,
                        "background": chunk.background,
                        "output_format": chunk.output_format
                    }
                elif chunk.type == "image_generation.completed":
                    yield {
                        "type": "completed",
                        "b64_json": chunk.b64_json,
                        "created_at": chunk.created_at,
                        "size": chunk.size,
                        "quality": chunk.quality,
                        "background": chunk.background,
                        "output_format": chunk.output_format,
                        "usage": getattr(chunk, 'usage', {})
                    }
                    
        except Exception as e:
            logger.error(f"Streaming generation failed: {e}")
            yield {
                "type": "error",
                "error": str(e)
            }
    
    def _handle_streaming_edit(self, params: Dict) -> Generator[Dict, None, None]:
        """Handle streaming image editing"""
        try:
            stream = self.client.images.edit(**params)
            
            for chunk in stream:
                if chunk.type == "image_edit.partial_image":
                    yield {
                        "type": "partial_image",
                        "b64_json": chunk.b64_json,
                        "partial_image_index": chunk.partial_image_index,
                        "created_at": chunk.created_at,
                        "size": chunk.size,
                        "quality": chunk.quality,
                        "background": chunk.background,
                        "output_format": chunk.output_format
                    }
                elif chunk.type == "image_edit.completed":
                    yield {
                        "type": "completed",
                        "b64_json": chunk.b64_json,
                        "created_at": chunk.created_at,
                        "size": chunk.size,
                        "quality": chunk.quality,
                        "background": chunk.background,
                        "output_format": chunk.output_format,
                        "usage": getattr(chunk, 'usage', {})
                    }
                    
        except Exception as e:
            logger.error(f"Streaming edit failed: {e}")
            yield {
                "type": "error",
                "error": str(e)
            }
    
    def base64_to_image_file(self, b64_data: str, filename: str = "generated.png") -> InMemoryUploadedFile:
        """Convert base64 data to InMemoryUploadedFile for S3 upload"""
        try:
            # Decode base64
            image_data = base64.b64decode(b64_data)
            
            # Create file-like object
            image_io = io.BytesIO(image_data)
            
            # Create InMemoryUploadedFile
            image_file = InMemoryUploadedFile(
                image_io,
                'ImageField',
                filename,
                'image/png',  # Default to PNG
                len(image_data),
                None
            )
            
            return image_file
            
        except Exception as e:
            logger.error(f"Failed to convert base64 to image file: {e}")
            raise


# Initialize service
openai_service = OpenAIImageService()
