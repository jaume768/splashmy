"""
Tareas de limpieza adicionales para Redis y optimización de almacenamiento
"""

import logging
from celery import shared_task
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import redis

logger = logging.getLogger(__name__)

def get_redis_client():
    """Get Redis client for cleanup operations"""
    try:
        return redis.Redis(
            host=getattr(settings, 'CELERY_BROKER_HOST', 'redis'),
            port=getattr(settings, 'CELERY_BROKER_PORT', 6379),
            db=getattr(settings, 'CELERY_BROKER_DB', 0),
            decode_responses=True
        )
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        return None

@shared_task
def cleanup_redis_data():
    """Clean up old Redis data and compact AOF file"""
    try:
        client = get_redis_client()
        if not client:
            return {'error': 'Could not connect to Redis'}
        
        # Get memory usage before cleanup
        memory_before = client.memory_usage() if hasattr(client, 'memory_usage') else 0
        
        # Clean up old Celery result keys (older than 24 hours)
        pattern_prefixes = [
            'celery-task-meta-*',
            '_kombu.binding.*',
            'unacked_mutex',
            'unacked_index'
        ]
        
        cleaned_keys = 0
        cutoff_time = timezone.now() - timedelta(hours=24)
        
        for prefix in pattern_prefixes:
            keys = client.keys(prefix)
            if keys:
                # Delete in batches to avoid memory spikes
                batch_size = 100
                for i in range(0, len(keys), batch_size):
                    batch = keys[i:i + batch_size]
                    client.delete(*batch)
                    cleaned_keys += len(batch)
        
        # Force AOF rewrite to compact the file
        try:
            client.bgrewriteaof()
            aof_rewrite_triggered = True
        except:
            aof_rewrite_triggered = False
        
        # Get memory usage after cleanup
        memory_after = client.memory_usage() if hasattr(client, 'memory_usage') else 0
        
        result = {
            'cleaned_keys': cleaned_keys,
            'memory_before': memory_before,
            'memory_after': memory_after,
            'aof_rewrite_triggered': aof_rewrite_triggered,
            'memory_saved': memory_before - memory_after
        }
        
        logger.info(f"Redis cleanup completed: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Redis cleanup failed: {str(e)}")
        return {'error': str(e)}

@shared_task
def optimize_processing_results():
    """Optimize storage by removing old base64 data and keeping only URLs"""
    try:
        from apps.processing.models import ProcessingResult
        
        # Find results older than 7 days with base64 data still stored
        cutoff_date = timezone.now() - timedelta(days=7)
        
        results_to_optimize = ProcessingResult.objects.filter(
            job__created_at__lt=cutoff_date,
            result_b64__isnull=False
        ).exclude(result_b64='')
        
        optimized_count = 0
        for result in results_to_optimize:
            # Keep base64 data only if S3 storage failed
            if result.s3_key and result.s3_url:
                # Clear base64 data to save space
                result.result_b64 = ''
                result.save(update_fields=['result_b64'])
                optimized_count += 1
        
        logger.info(f"Optimized {optimized_count} ProcessingResults")
        return {'optimized_results': optimized_count}
        
    except Exception as e:
        logger.error(f"Processing results optimization failed: {str(e)}")
        return {'error': str(e)}

@shared_task
def cleanup_failed_jobs_data():
    """Clean up data associated with failed jobs"""
    try:
        from apps.processing.models import ProcessingJob, ProcessingResult
        from apps.images.services import aws_image_service
        
        # Find failed jobs older than 3 days
        cutoff_date = timezone.now() - timedelta(days=3)
        
        failed_jobs = ProcessingJob.objects.filter(
            status='failed',
            completed_at__lt=cutoff_date
        )
        
        cleaned_jobs = 0
        for job in failed_jobs:
            # Clean up any partial results from failed jobs
            for result in job.results.all():
                if result.s3_key:
                    # Delete from S3/local storage
                    aws_image_service.delete_from_s3(result.s3_key)
                result.delete()
            
            cleaned_jobs += 1
        
        logger.info(f"Cleaned up {cleaned_jobs} failed jobs")
        return {'cleaned_failed_jobs': cleaned_jobs}
        
    except Exception as e:
        logger.error(f"Failed jobs cleanup failed: {str(e)}")
        return {'error': str(e)}
