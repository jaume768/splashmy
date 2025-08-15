"""
Celery tasks for image processing with OpenAI
"""

import logging
import time
import os
import boto3
import io
from typing import Dict, Any
from celery import shared_task
from django.conf import settings
import datetime 
from django.utils import timezone
from django.core.files.uploadedfile import InMemoryUploadedFile

from .models import ProcessingJob, ProcessingResult
from .services import openai_service
from apps.images.services import aws_image_service

logger = logging.getLogger(__name__)

def _load_image_from_storage(img_obj) -> InMemoryUploadedFile:
    """Load image from S3 storage and return as InMemoryUploadedFile"""
    s3 = boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME
    )
    buf = io.BytesIO()
    s3.download_fileobj(settings.AWS_STORAGE_BUCKET_NAME, img_obj.s3_key, buf)
    buf.seek(0)
    return InMemoryUploadedFile(
        buf, 
        "ImageField", 
        os.path.basename(img_obj.s3_key), 
        "image/png", 
        buf.getbuffer().nbytes, 
        None
    )


def _bool(val):
    """Convierte 'True'/'False'/1/0 a bool."""
    if isinstance(val, bool):
        return val
    return str(val).lower() in ("true", "1", "yes")

USE_S3 = _bool(getattr(settings, "USE_S3_STORAGE", False))

def _get_image_file(img_obj) -> InMemoryUploadedFile:
    """
    Devuelve la imagen como InMemoryUploadedFile.

    1️⃣  Si USE_S3=True y hay s3_key      👉 descarga de S3  
    2️⃣  Si existe fichero local usando s3_key  
    3️⃣  Si existe fichero local usando original_image.name
    """
    import os
    from urllib.parse import urlparse
    
    logger.info(f"Loading image for Celery task. Image ID: {img_obj.id}")
    logger.info(f"Image s3_key: {img_obj.s3_key}")
    logger.info(f"Image s3_url: {getattr(img_obj, 's3_url', 'N/A')}")
    logger.info(f"Image original_image field: {getattr(img_obj, 'original_image', 'N/A')}")
    logger.info(f"MEDIA_ROOT: {settings.MEDIA_ROOT}")
    logger.info(f"USE_S3: {USE_S3}")
    
    # --- S3 ---------------------------------------------------------
    if USE_S3 and img_obj.s3_key:
        return _load_image_from_storage(img_obj)

    # --- LOCAL with robust path resolution --------------------------
    local_path = None
    tried_paths = []
    
    # Strategy 1: Clean s3_key if it contains URL components
    if img_obj.s3_key:
        s3_key = img_obj.s3_key
        
        # Handle absolute URLs
        if s3_key.startswith(('http://', 'https://')):
            parsed = urlparse(s3_key)
            s3_key = parsed.path.lstrip('/')
            if s3_key.startswith('media/'):
                s3_key = s3_key[6:]  # Remove 'media/' prefix
        
        # Handle paths starting with /media/
        elif s3_key.startswith('/media/'):
            s3_key = s3_key[7:]  # Remove '/media/' prefix
        
        # Handle paths starting with media/
        elif s3_key.startswith('media/'):
            s3_key = s3_key[6:]  # Remove 'media/' prefix
        
        local_path = os.path.join(settings.MEDIA_ROOT, s3_key)
        tried_paths.append(f"Strategy 1 (cleaned s3_key): {local_path}")
    
    # Strategy 2: Use Django FileField path if s3_key strategy failed
    if not local_path or not os.path.exists(local_path):
        if hasattr(img_obj, 'original_image') and img_obj.original_image:
            try:
                # Try Django FileField .path property
                if hasattr(img_obj.original_image, 'path'):
                    local_path = img_obj.original_image.path
                    tried_paths.append(f"Strategy 2a (FileField.path): {local_path}")
                else:
                    # Build path from FileField .name
                    local_path = os.path.join(settings.MEDIA_ROOT, str(img_obj.original_image))
                    tried_paths.append(f"Strategy 2b (FileField.name): {local_path}")
            except Exception as e:
                tried_paths.append(f"Strategy 2 failed: {str(e)}")
    
    # Strategy 3: Try s3_url as fallback
    if not local_path or not os.path.exists(local_path):
        if hasattr(img_obj, 's3_url') and img_obj.s3_url:
            s3_url = img_obj.s3_url
            
            # Handle absolute URLs in s3_url
            if s3_url.startswith(('http://', 'https://')):
                parsed = urlparse(s3_url)
                s3_url = parsed.path.lstrip('/')
                if s3_url.startswith('media/'):
                    s3_url = s3_url[6:]  # Remove 'media/' prefix
            elif s3_url.startswith('/media/'):
                s3_url = s3_url[7:]  # Remove '/media/' prefix
            elif s3_url.startswith('media/'):
                s3_url = s3_url[6:]  # Remove 'media/' prefix
            
            if s3_url:  # Only if we have something left
                local_path = os.path.join(settings.MEDIA_ROOT, s3_url)
                tried_paths.append(f"Strategy 3 (cleaned s3_url): {local_path}")

    # Log what we tried
    for path_attempt in tried_paths:
        logger.info(f"Tried path: {path_attempt}")

    # Final check
    if not local_path or not os.path.exists(local_path):
        # List actual files in media directory for debugging
        try:
            if os.path.exists(settings.MEDIA_ROOT):
                media_contents = []
                for root, dirs, files in os.walk(settings.MEDIA_ROOT):
                    for file in files[:10]:  # Limit to first 10 files per directory
                        rel_path = os.path.relpath(os.path.join(root, file), settings.MEDIA_ROOT)
                        media_contents.append(rel_path)
                logger.info(f"Media directory contents (sample): {media_contents}")
        except Exception as e:
            logger.error(f"Could not list media directory: {e}")
        
        debug_info = {
            'MEDIA_ROOT': settings.MEDIA_ROOT,
            'USE_S3': USE_S3,
            's3_key': img_obj.s3_key,
            's3_url': getattr(img_obj, 's3_url', None),
            'original_image_field': str(getattr(img_obj, 'original_image', None)),
            'attempted_paths': tried_paths,
            'final_path': local_path,
            'path_exists': os.path.exists(local_path) if local_path else False
        }
        raise ValueError(f"Image {img_obj.id} not found locally and USE_S3={USE_S3}. Debug info: {debug_info}")

    logger.info(f"Successfully found image at: {local_path}")
    
    # Load and validate the file
    try:
        with open(local_path, 'rb') as f:
            data = f.read()
        
        if len(data) == 0:
            raise ValueError(f"Image file is empty: {local_path}")
        
        logger.info(f"Loaded image data: {len(data)} bytes")
        
        return InMemoryUploadedFile(
            io.BytesIO(data),
            "ImageField",
            os.path.basename(local_path),
            "image/png",
            len(data),
            None,
        )
        
    except Exception as e:
        raise ValueError(f"Failed to load image file {local_path}: {str(e)}")


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def process_image_job_async(self, job_id: str) -> Dict[str, Any]:

    try:
        # Get the job from database
        job = ProcessingJob.objects.get(id=job_id)
        
        # Update job status to processing
        job.status = 'processing'
        job.started_at = timezone.now()
        job.save(update_fields=['status', 'started_at'])
        
        logger.info(f"Starting async processing for job {job_id}")
        
        # Process based on job type
        if job.job_type == 'generation':
            result = _process_generation_task(job)
        elif job.job_type == 'edit':
            result = _process_edit_task(job)
        elif job.job_type == 'style_transfer':
            result = _process_style_transfer_task(job)
        else:
            raise ValueError(f"Unknown job type: {job.job_type}")
        
        # Check if processing was successful
        if 'error' in result:
            job.status = 'failed'
            job.error_message = result['error']
            job.error_details = result.get('details', {})
            job.completed_at = timezone.now()
            job.save(update_fields=['status', 'error_message', 'error_details', 'completed_at'])
            
            logger.error(f"Job {job_id} failed: {result['error']}")
            return result
        
        # Save processing results
        _save_processing_results(job, result)
        
        # Update job as completed
        job.status = 'completed'
        job.completed_at = timezone.now()
        if job.started_at:
            job.processing_time = (job.completed_at - job.started_at).total_seconds()
        job.save(update_fields=['status', 'completed_at', 'processing_time'])
        
        logger.info(f"Job {job_id} completed successfully in {job.processing_time}s")
        
        return {
            'success': True,
            'job_id': str(job_id),
            'processing_time': job.processing_time,
            'results_count': job.results.count()
        }
        
    except ProcessingJob.DoesNotExist:
        error_msg = f"ProcessingJob {job_id} not found"
        logger.error(error_msg)
        return {'error': error_msg}
        
    except Exception as e:
        logger.error(f"Unexpected error processing job {job_id}: {str(e)}")
        
        # Retry logic
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying job {job_id} (attempt {self.request.retries + 1})")
            raise self.retry(exc=e)
        
        # Mark job as failed after max retries
        try:
            job = ProcessingJob.objects.get(id=job_id)
            job.status = 'failed'
            job.error_message = f"Processing failed after {self.max_retries} retries"
            job.error_details = {'last_error': str(e), 'retries': self.request.retries}
            job.completed_at = timezone.now()
            job.save(update_fields=['status', 'error_message', 'error_details', 'completed_at'])
        except:
            pass
            
        return {
            'error': 'Processing failed after retries',
            'details': str(e),
            'retries': self.request.retries
        }


def _process_generation_task(job: ProcessingJob) -> Dict[str, Any]:
    """Process image generation job"""
    try:
        # Build prompt with style
        prompt = job.prompt
        if job.style:
            prompt = job.style.get_full_prompt(job.prompt)
        
        # Call OpenAI service
        result = openai_service.generate_image(
            prompt=prompt,
            style_params=job.openai_parameters,
            user_id=str(job.user.id)
        )
        
        return result
        
    except Exception as e:
        return {"error": f"Generation failed: {str(e)}"}


def _process_edit_task(job: ProcessingJob) -> Dict[str, Any]:
    """Process image editing job"""
    try:
        if not job.original_image:
            return {"error": "Original image required for editing"}
        
        # Get image file using helper that supports S3 and local storage
        image_file = _get_image_file(job.original_image)
        
        # Build prompt with style
        prompt = job.prompt
        if job.style:
            prompt = job.style.get_full_prompt(job.prompt)
        
        # Call OpenAI service - FIXED: pass as list
        result = openai_service.edit_image(
            image_files=[image_file],  # Pass as list as expected by service
            prompt=prompt,
            style_params=job.openai_parameters,
            user_id=str(job.user.id)
        )
        
        return result
        
    except Exception as e:
        return {"error": f"Edit failed: {str(e)}"}


def _process_style_transfer_task(job: ProcessingJob) -> Dict[str, Any]:
    """Process style transfer job"""
    try:
        if not job.original_image:
            return {"error": "Original image required for style transfer"}
        
        if not job.style:
            return {"error": "Style required for style transfer"}
        
        # Get image file using helper that supports S3 and local storage
        image_file = _get_image_file(job.original_image)
        
        # Build style-specific prompt
        prompt = job.style.get_full_prompt(job.prompt or f"Transform this image to {job.style.name} style")
        
        # Call OpenAI service - FIXED: pass as list
        result = openai_service.edit_image(
            image_files=[image_file],  # Pass as list as expected by service
            prompt=prompt,
            style_params=job.openai_parameters,
            user_id=str(job.user.id)
        )
        
        return result
        
    except Exception as e:
        return {"error": f"Style transfer failed: {str(e)}"}


def _save_processing_results(job: ProcessingJob, result: Dict[str, Any]):
    """Save processing results to database and S3"""
    try:
        images = result.get('images', [])
        
        for i, image_data in enumerate(images):

            created_ts = image_data.get("created", result.get("created", timezone.now().timestamp()))
            created_dt = timezone.make_aware(datetime.datetime.fromtimestamp(created_ts), timezone.utc)

            b64_data = image_data.get('b64_json')
            if not b64_data:
                continue
            
            # Convert base64 to image file
            filename = f"processed_{job.id}_{i}.{result.get('output_format', 'png')}"
            image_file = openai_service.base64_to_image_file(b64_data, filename)
            
            # Upload to S3
            s3_key, s3_url = aws_image_service.upload_processed_image(
                image_file, job.user.id
            )
            
            # Create ProcessingResult
            ProcessingResult.objects.create(
                job=job,
                result_b64=b64_data,
                result_format=result.get('output_format', 'png'),
                result_size=result.get('size', '1024x1024'),
                result_quality=result.get('quality', 'auto'),
                result_background=result.get('background', 'auto'),
                is_public=job.is_public,
                s3_key=s3_key,
                s3_url=s3_url,
                openai_created_at=created_dt,
                token_usage=result.get('usage', {})
            )
            
    except Exception as e:
        logger.error(f"Failed to save results for job {job.id}: {str(e)}")
        raise


@shared_task
def cleanup_old_jobs():
    """Clean up old completed/failed jobs (runs periodically)"""
    try:
        # Delete jobs older than 30 days
        cutoff_date = timezone.now() - timezone.timedelta(days=30)
        
        old_jobs = ProcessingJob.objects.filter(
            created_at__lt=cutoff_date,
            status__in=['completed', 'failed', 'cancelled']
        )
        
        deleted_count = old_jobs.count()
        old_jobs.delete()
        
        logger.info(f"Cleaned up {deleted_count} old processing jobs")
        return {'cleaned_jobs': deleted_count}
        
    except Exception as e:
        logger.error(f"Failed to cleanup old jobs: {str(e)}")
        return {'error': str(e)}


@shared_task
def update_processing_stats():
    """Update processing statistics (runs periodically)"""
    try:
        from django.db.models import Count, Avg, Q
        from apps.processing.models import UserProcessingQuota
        
        # Update aggregate stats - this could be expanded
        stats = ProcessingJob.objects.aggregate(
            total_jobs=Count('id'),
            avg_processing_time=Avg('processing_time'),
            completed_jobs=Count('id', filter=Q(status='completed')),
            failed_jobs=Count('id', filter=Q(status='failed'))
        )
        
        logger.info(f"Updated processing stats: {stats}")
        return stats
        
    except Exception as e:
        logger.error(f"Failed to update processing stats: {str(e)}")
        return {'error': str(e)}


@shared_task
def send_job_notification(job_id: str, status: str, user_email: str):
    """Send notification when job status changes (optional)"""
    try:
        # This could integrate with email service, push notifications, etc.
        logger.info(f"Job {job_id} changed to {status} for user {user_email}")
        
        # TODO: Implement actual notification service
        # - Email notifications
        # - WebSocket notifications
        # - Push notifications
        
        return {'notification_sent': True, 'job_id': job_id, 'status': status}
        
    except Exception as e:
        logger.error(f"Failed to send notification for job {job_id}: {str(e)}")
        return {'error': str(e)}
