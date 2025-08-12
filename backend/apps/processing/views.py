import json
import base64
import io
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.conf import settings
from django.db.models import Q, Avg, Count
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import StreamingHttpResponse
from .models import ProcessingJob, ProcessingResult, StreamingEvent, UserProcessingQuota, ProcessingTemplate, ProcessingResultLike
from .serializers import (
    ProcessingJobCreateSerializer, ProcessingJobSerializer, ProcessingResultSerializer,
    UserProcessingQuotaSerializer, ProcessingTemplateSerializer, ProcessingStatsSerializer
)
from .services import openai_service
from apps.images.models import Image
from apps.images.services import aws_image_service
from apps.styles.models import Style
import logging

logger = logging.getLogger(__name__)

class ProcessingJobCreateView(generics.CreateAPIView):
    """Create and start processing job with OpenAI gpt-image-1"""
    
    serializer_class = ProcessingJobCreateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            user = request.user
            job_data = serializer.validated_data
            
            # Check user quota
            quota, created = UserProcessingQuota.objects.get_or_create(user=user)
            if not quota.can_process(job_data['job_type']):
                return Response({
                    'error': 'Daily quota exceeded',
                    'details': f"You have reached your daily limit for {job_data['job_type']}"
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)
            
            # Create processing job
            job = ProcessingJob.objects.create(
                user=user,
                job_type=job_data['job_type'],
                prompt=job_data['prompt'],
                original_image_id=job_data.get('original_image_id'),
                style_id=job_data.get('style_id'),
                is_public=job_data.get('is_public', False),
                openai_parameters={
                    'quality': job_data.get('quality', 'auto'),
                    'background': job_data.get('background', 'auto'),
                    'output_format': job_data.get('output_format', 'png'),
                    'size': job_data.get('size', 'auto'),
                    'output_compression': job_data.get('output_compression', 85),
                    'n': job_data.get('n', 1),
                    'stream': job_data.get('stream', False),
                    'moderation': job_data.get('moderation', 'auto'),
                    'input_fidelity': job_data.get('input_fidelity', 'low'),
                    'partial_images': job_data.get('partial_images', 0)
                }
            )
            
            # Start processing asynchronously with Celery
            from .tasks import process_image_job_async
            
            # Queue the job for async processing
            task = process_image_job_async.delay(str(job.id))
            
            # Store task ID for tracking
            job.celery_task_id = task.id
            job.save(update_fields=['celery_task_id'])
            
            return Response({
                'job_id': job.id,
                'status': job.status,
                'message': 'Processing job started',
                'streaming': job_data.get('stream', False)
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                'error': 'Failed to create processing job',
                'details': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    def _start_processing_job(self, job: ProcessingJob):
        """Start processing job with proper moderation flow"""
        try:
            job.status = 'moderating'
            job.started_at = timezone.now()
            job.save()
            
            # Handle different job types
            if job.job_type == 'generation':
                result = self._process_generation(job)
            elif job.job_type == 'edit':
                result = self._process_edit(job)
            elif job.job_type == 'style_transfer':
                result = self._process_style_transfer(job)
            else:
                raise ValueError(f"Unknown job type: {job.job_type}")
            
            if result.get('success'):
                job.status = 'completed'
                job.completed_at = timezone.now()
                job.processing_time = (job.completed_at - job.started_at).total_seconds()
                job.openai_response = result
                
                # Save results to database and S3
                self._save_processing_results(job, result)
                
                # Update user quota
                quota = UserProcessingQuota.objects.get(user=job.user)
                quota.increment_usage(job.job_type)
                
            else:
                job.status = 'failed'
                job.error_message = result.get('error', 'Unknown error')
                job.error_details = result
            
            job.save()
            
        except Exception as e:
            job.status = 'failed'
            job.error_message = str(e)
            job.save()
    
    def _process_generation(self, job: ProcessingJob) -> dict:
        """Process image generation job"""
        try:
            # Build prompt from style if provided
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
            return {"error": str(e)}
    
    def _process_edit(self, job: ProcessingJob) -> dict:
        """Process image editing job"""
        try:
            if not job.original_image:
                return {"error": "Original image required for editing"}
            
            # Get original image file
            original_image = job.original_image
            if not original_image.s3_key:
                return {"error": "Original image not found in storage"}
            
            # Download image from S3 (simplified - in real implementation you'd handle this properly)
            # For now, we'll assume the image is accessible
            
            # Build prompt from style if provided
            prompt = job.prompt
            if job.style:
                prompt = job.style.get_full_prompt(job.prompt)
            
            # Note: This is simplified - in real implementation you'd download the image from S3
            # and convert it to the proper format for OpenAI
            return {"error": "Image editing temporarily unavailable - S3 download not implemented"}
            
        except Exception as e:
            return {"error": str(e)}
    
    def _process_style_transfer(self, job: ProcessingJob) -> dict:
        """Process style transfer job"""
        try:
            if not job.original_image or not job.style:
                return {"error": "Both original image and style required for style transfer"}
            
            # Build style-specific prompt
            prompt = job.style.get_full_prompt(job.prompt)
            
            # Use style's default parameters if not overridden
            style_params = job.openai_parameters.copy()
            if style_params.get('quality') == 'auto':
                style_params['quality'] = job.style.default_quality
            if style_params.get('background') == 'auto':
                style_params['background'] = job.style.default_background
            if style_params.get('output_format') == 'auto':
                style_params['output_format'] = job.style.default_output_format
            if style_params.get('size') == 'auto':
                style_params['size'] = job.style.default_size
            
            # Get original image file for editing
            original_image = job.original_image
            if not original_image.s3_key:
                return {"error": "Original image not found in storage"}
            
            # Load image file from storage
            if hasattr(settings, 'USE_S3_STORAGE') and settings.USE_S3_STORAGE:
                # TODO: Load from S3
                return {"error": "S3 image loading not implemented yet"}
            else:
                # Load from local storage
                import os
                local_path = os.path.join(settings.MEDIA_ROOT, original_image.s3_key)
                if not os.path.exists(local_path):
                    return {"error": f"Original image file not found: {local_path}"}
                
                from django.core.files.uploadedfile import InMemoryUploadedFile
                with open(local_path, 'rb') as f:
                    image_data = f.read()
                    image_file = InMemoryUploadedFile(
                        io.BytesIO(image_data),
                        'ImageField',
                        original_image.original_filename,
                        f'image/{original_image.format.lower()}',
                        len(image_data),
                        None
                    )
            
            # Use edit_image for style transfer
            result = openai_service.edit_image(
                image_files=[image_file],
                prompt=prompt,
                style_params=style_params,
                user_id=str(job.user.id)
            )
            
            return result
            
        except Exception as e:
            return {"error": str(e)}
    
    def _save_processing_results(self, job: ProcessingJob, result: dict):
        """Save processing results to database and S3"""
        try:
            images = result.get('images', [])
            
            for i, image_data in enumerate(images):
                b64_data = image_data.get('b64_json')
                if not b64_data:
                    continue
                
                # Convert base64 to image file
                filename = f"processed_{job.id}_{i}.{result.get('output_format', 'png')}"
                image_file = openai_service.base64_to_image_file(b64_data, filename)
                
                # Upload to S3
                s3_key = f"processed/{job.user.id}/{job.id}_{i}.{result.get('output_format', 'png')}"
                s3_url = aws_image_service.upload_to_s3(image_file, s3_key)
                
                # Save result to database
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
                    openai_created_at=timezone.fromtimestamp(result.get('created', timezone.now().timestamp())),
                    token_usage=result.get('usage', {})
                )
                
        except Exception as e:
            return {"error": str(e)}


class ProcessingJobListView(generics.ListAPIView):
    """List user's processing jobs"""
    
    serializer_class = ProcessingJobSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = ProcessingJob.objects.filter(user=user)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by job type
        job_type = self.request.query_params.get('job_type')
        if job_type:
            queryset = queryset.filter(job_type=job_type)
        
        return queryset.order_by('-created_at')


class ProcessingJobDetailView(generics.RetrieveAPIView):
    """Get details of specific processing job"""
    
    serializer_class = ProcessingJobSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return ProcessingJob.objects.filter(user=self.request.user)


class ProcessingResultListView(generics.ListAPIView):
    """List processing results with absolute URLs for development"""
    
    serializer_class = ProcessingResultSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def build_media_url(self, file_path):
        """Build absolute URL for media files in development, relative in production"""
        from django.conf import settings
        
        if not file_path:
            return ''
            
        # If it's already an absolute URL (S3), return as is
        if file_path.startswith(('http://', 'https://')):
            return file_path
            
        # For development, build absolute URL pointing to backend
        if settings.DEBUG and not getattr(settings, 'USE_S3_STORAGE', False):
            backend_host = getattr(settings, 'BACKEND_HOST', 'localhost:8000')
            scheme = 'https' if self.request.is_secure() else 'http'
            
            # Clean path if it starts with /media/
            clean_path = file_path
            if clean_path.startswith(settings.MEDIA_URL):
                clean_path = clean_path[len(settings.MEDIA_URL):]
                
            return f"{scheme}://{backend_host}{settings.MEDIA_URL}{clean_path}"
        else:
            # For production with S3 or when file_path already has MEDIA_URL
            if file_path.startswith(settings.MEDIA_URL):
                return file_path
            return f"{settings.MEDIA_URL}{file_path}"
    
    def get_queryset(self):
        user = self.request.user
        queryset = ProcessingResult.objects.filter(job__user=user)
        
        # Filter by job
        job_id = self.request.query_params.get('job_id')
        if job_id:
            queryset = queryset.filter(job_id=job_id)
        
        # Filter favorites
        favorites_only = self.request.query_params.get('favorites')
        if favorites_only and favorites_only.lower() == 'true':
            queryset = queryset.filter(is_favorite=True)
        
        return queryset.order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        """Override list to apply build_media_url to s3_url fields"""
        response = super().list(request, *args, **kwargs)
        
        # Apply build_media_url to each result's s3_url
        if hasattr(response, 'data') and 'results' in response.data:
            for result in response.data['results']:
                if 's3_url' in result:
                    result['s3_url'] = self.build_media_url(result['s3_url'])
        
        return response


class LikedProcessingResultListView(generics.ListAPIView):
    """List of processing results liked by the authenticated user"""
    
    serializer_class = ProcessingResultSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def build_media_url(self, file_path):
        """Build absolute URL for media files in development, relative in production"""
        from django.conf import settings
        
        if not file_path:
            return ''
            
        # If it's already an absolute URL (S3), return as is
        if file_path.startswith(('http://', 'https://')):
            return file_path
            
        # For development, build absolute URL pointing to backend
        if settings.DEBUG and not getattr(settings, 'USE_S3_STORAGE', False):
            backend_host = getattr(settings, 'BACKEND_HOST', 'localhost:8000')
            scheme = 'https' if self.request.is_secure() else 'http'
            
            # Clean path if it starts with /media/
            clean_path = file_path
            if clean_path.startswith(settings.MEDIA_URL):
                clean_path = clean_path[len(settings.MEDIA_URL):]
                
            return f"{scheme}://{backend_host}{settings.MEDIA_URL}{clean_path}"
        else:
            # For production with S3 or when file_path already has MEDIA_URL
            if file_path.startswith(settings.MEDIA_URL):
                return file_path
            return f"{settings.MEDIA_URL}{file_path}"
    
    def get_queryset(self):
        user = self.request.user
        queryset = ProcessingResult.objects.filter(likes__user=user).annotate(
            like_count=Count('likes')
        )
        # Support ordering by like_count or created_at
        ordering = self.request.query_params.get('ordering')
        allowed = {'created_at', '-created_at', 'like_count', '-like_count'}
        if ordering in allowed:
            return queryset.order_by(ordering)
        # Default: most recent like first (by result creation)
        return queryset.order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        """Override list to apply build_media_url to s3_url fields"""
        response = super().list(request, *args, **kwargs)
        
        # Apply build_media_url to each result's s3_url
        if hasattr(response, 'data') and 'results' in response.data:
            for result in response.data['results']:
                if 's3_url' in result:
                    result['s3_url'] = self.build_media_url(result['s3_url'])
        
        return response


class ProcessingResultDetailView(generics.RetrieveAPIView):
    """Retrieve a single processing result. Public results are visible to anyone; non-public only to owner."""
    serializer_class = ProcessingResultSerializer
    permission_classes = [permissions.AllowAny]

    lookup_url_kwarg = 'result_id'
    lookup_field = 'id'

    def get_queryset(self):
        qs = ProcessingResult.objects.all()
        user = getattr(self.request, 'user', None)
        if user and user.is_authenticated:
            qs = qs.filter(Q(is_public=True) | Q(job__user=user))
        else:
            qs = qs.filter(is_public=True)
        return qs.annotate(like_count=Count('likes')).order_by('-created_at')

    def build_media_url(self, file_path):
        """Build absolute URL for media files in development, relative in production"""
        from django.conf import settings
        
        if not file_path:
            return ''
        # If it's already an absolute URL (S3), return as is
        if file_path.startswith(('http://', 'https://')):
            return file_path
        # For development, build absolute URL pointing to backend
        if settings.DEBUG and not getattr(settings, 'USE_S3_STORAGE', False):
            backend_host = getattr(settings, 'BACKEND_HOST', 'localhost:8000')
            scheme = 'https' if self.request.is_secure() else 'http'
            clean_path = file_path
            if clean_path.startswith(settings.MEDIA_URL):
                clean_path = clean_path[len(settings.MEDIA_URL):]
            return f"{scheme}://{backend_host}{settings.MEDIA_URL}{clean_path}"
        else:
            # For production with S3 or when file_path already has MEDIA_URL
            if file_path.startswith(settings.MEDIA_URL):
                return file_path
            return f"{settings.MEDIA_URL}{file_path}"

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        if hasattr(response, 'data') and 's3_url' in response.data:
            response.data['s3_url'] = self.build_media_url(response.data['s3_url'])
        return response


class PublicProcessingResultListView(generics.ListAPIView):
    """Public list of processing results (only is_public=True)"""
    
    serializer_class = ProcessingResultSerializer
    permission_classes = [permissions.AllowAny]
    
    def build_media_url(self, file_path):
        """Build absolute URL for media files in development, relative in production"""
        from django.conf import settings
        
        if not file_path:
            return ''
            
        # If it's already an absolute URL (S3), return as is
        if file_path.startswith(('http://', 'https://')):
            return file_path
            
        # For development, build absolute URL pointing to backend
        if settings.DEBUG and not getattr(settings, 'USE_S3_STORAGE', False):
            backend_host = getattr(settings, 'BACKEND_HOST', 'localhost:8000')
            scheme = 'https' if self.request.is_secure() else 'http'
            
            # Clean path if it starts with /media/
            clean_path = file_path
            if clean_path.startswith(settings.MEDIA_URL):
                clean_path = clean_path[len(settings.MEDIA_URL):]
                
            return f"{scheme}://{backend_host}{settings.MEDIA_URL}{clean_path}"
        else:
            # For production with S3 or when file_path already has MEDIA_URL
            if file_path.startswith(settings.MEDIA_URL):
                return file_path
            return f"{settings.MEDIA_URL}{file_path}"
    
    def get_queryset(self):
        queryset = ProcessingResult.objects.filter(is_public=True).annotate(
            like_count=Count('likes')
        )
        # Support ordering by like_count or created_at
        ordering = self.request.query_params.get('ordering')
        allowed = {'created_at', '-created_at', 'like_count', '-like_count'}
        if ordering in allowed:
            return queryset.order_by(ordering)
        # Default: most recent first
        return queryset.order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        """Override list to apply build_media_url to s3_url fields"""
        response = super().list(request, *args, **kwargs)
        
        # Apply build_media_url to each result's s3_url
        if hasattr(response, 'data') and 'results' in response.data:
            for result in response.data['results']:
                if 's3_url' in result:
                    result['s3_url'] = self.build_media_url(result['s3_url'])
        
        return response


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def cancel_processing_job(request, job_id):
    """Cancel a processing job"""
    
    try:
        job = get_object_or_404(ProcessingJob, id=job_id, user=request.user)
        
        if job.status in ['completed', 'failed', 'cancelled']:
            return Response({
                'error': f'Cannot cancel job with status: {job.status}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        job.status = 'cancelled'
        job.save()
        
        return Response({
            'message': 'Job cancelled successfully'
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def toggle_result_favorite(request, result_id):
    """Toggle favorite status of processing result"""
    
    try:
        result = get_object_or_404(
            ProcessingResult, 
            id=result_id, 
            job__user=request.user
        )
        
        result.is_favorite = not result.is_favorite
        result.save()
        
        return Response({
            'is_favorite': result.is_favorite,
            'message': f"Result {'added to' if result.is_favorite else 'removed from'} favorites"
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def toggle_result_like(request, result_id):
    """Toggle like for a public processing result by the current user."""
    try:
        result = get_object_or_404(ProcessingResult, id=result_id)

        # Only allow liking if result is public, or the user owns the job (optional)
        if not result.is_public and result.job.user != request.user:
            return Response({'error': 'Not allowed to like this result.'}, status=status.HTTP_403_FORBIDDEN)

        like, created = ProcessingResultLike.objects.get_or_create(user=request.user, result=result)
        if created:
            liked = True
        else:
            # Already liked -> unlike
            like.delete()
            liked = False

        like_count = result.likes.count()
        return Response({'liked': liked, 'like_count': like_count})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def toggle_result_visibility(request, result_id):
    """Toggle or set the visibility (is_public) of a processing result.

    Only the owner of the result (job user) can change visibility.

    Request body (optional): { "is_public": true|false }
    If omitted, the endpoint toggles the current value.
    """
    try:
        result = get_object_or_404(
            ProcessingResult,
            id=result_id,
            job__user=request.user,
        )

        # Determine desired state: explicit value or toggle
        if isinstance(request.data, dict) and 'is_public' in request.data:
            desired = bool(request.data.get('is_public'))
        else:
            desired = not bool(result.is_public)

        result.is_public = desired
        result.save()

        return Response({
            'is_public': result.is_public,
            'message': f"Visibility set to {'public' if result.is_public else 'private'}"
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def rate_result(request, result_id):
    """Rate a processing result"""
    
    try:
        rating = request.data.get('rating')
        
        if not rating or not isinstance(rating, int) or rating < 1 or rating > 5:
            return Response({
                'error': 'Rating must be an integer between 1 and 5'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        result = get_object_or_404(
            ProcessingResult, 
            id=result_id, 
            job__user=request.user
        )
        
        result.user_rating = rating
        result.save()
        
        return Response({
            'rating': rating,
            'message': 'Rating saved successfully'
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def download_result(request, result_id):
    """Generate download URL for processing result"""
    
    def build_download_url(s3_url):
        """Build absolute URL for download in development, S3 URL in production"""
        from django.conf import settings
        
        if not s3_url:
            return ''
            
        # If it's already an absolute URL (S3), return as is
        if s3_url.startswith(('http://', 'https://')):
            return s3_url
            
        # For development, build absolute URL pointing to backend
        if settings.DEBUG and not getattr(settings, 'USE_S3_STORAGE', False):
            backend_host = getattr(settings, 'BACKEND_HOST', 'localhost:8000')
            scheme = 'https' if request.is_secure() else 'http'
            
            # Clean path if it starts with /media/
            clean_path = s3_url
            if clean_path.startswith(settings.MEDIA_URL):
                clean_path = clean_path[len(settings.MEDIA_URL):]
                
            return f"{scheme}://{backend_host}{settings.MEDIA_URL}{clean_path}"
        else:
            # Production: try to generate presigned URL
            try:
                download_url = aws_image_service.generate_presigned_url(
                    s3_url, 
                    expiration=3600
                )
                return download_url
            except:
                return s3_url
    
    try:
        result = get_object_or_404(
            ProcessingResult, 
            id=result_id, 
            job__user=request.user
        )
        
        # Use s3_url (which contains the file path) for building download URL
        download_url = build_download_url(result.s3_url)
        
        if not download_url:
            return Response({
                'error': 'Result not found in storage'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Increment download count
        result.download_count += 1
        result.save()
        
        return Response({
            'download_url': download_url,
            'expires_in': 3600
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_quota(request):
    """Get user's processing quota and limits"""
    
    quota, created = UserProcessingQuota.objects.get_or_create(user=request.user)
    serializer = UserProcessingQuotaSerializer(quota)
    
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def processing_stats(request):
    """Get user's processing statistics"""
    
    user = request.user
    
    # Get basic stats
    jobs = ProcessingJob.objects.filter(user=user)
    results = ProcessingResult.objects.filter(job__user=user)
    
    stats = {
        'total_jobs': jobs.count(),
        'completed_jobs': jobs.filter(status='completed').count(),
        'failed_jobs': jobs.filter(status='failed').count(),
        'pending_jobs': jobs.filter(status__in=['pending', 'moderating', 'processing']).count(),
        
        'total_generations': jobs.filter(job_type='generation').count(),
        'total_edits': jobs.filter(job_type='edit').count(),
        'total_style_transfers': jobs.filter(job_type='style_transfer').count(),
        
        'average_processing_time': jobs.filter(
            processing_time__isnull=False
        ).aggregate(avg_time=Avg('processing_time'))['avg_time'] or 0,
        
        'total_processing_time': sum(
            job.processing_time for job in jobs if job.processing_time
        ),
    }
    
    # Get quota info
    quota, created = UserProcessingQuota.objects.get_or_create(user=user)
    stats['quota_info'] = UserProcessingQuotaSerializer(quota).data
    
    # Get recent activity
    stats['recent_jobs'] = ProcessingJobSerializer(
        jobs.order_by('-created_at')[:5], many=True
    ).data
    
    stats['recent_results'] = ProcessingResultSerializer(
        results.order_by('-created_at')[:5], many=True
    ).data
    
    return Response(stats)


class ProcessingTemplateListView(generics.ListCreateAPIView):
    """List and create processing templates"""
    
    serializer_class = ProcessingTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = ProcessingTemplate.objects.filter(is_public=True)
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        # Filter by job type
        job_type = self.request.query_params.get('job_type')
        if job_type:
            queryset = queryset.filter(job_type=job_type)
        
        return queryset.order_by('-usage_count', 'name')
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_job_results(request, job_id):
    """Get complete job results with all processing data"""
    
    def build_media_url(file_path):
        """Build absolute URL for media files in development, relative in production"""
        from django.conf import settings
        
        if not file_path:
            return ''
            
        # If it's already an absolute URL (S3), return as is
        if file_path.startswith(('http://', 'https://')):
            return file_path
            
        # For development, build absolute URL pointing to backend
        if settings.DEBUG and not getattr(settings, 'USE_S3_STORAGE', False):
            # En desarrollo local, siempre usar el puerto del backend (8000)
            # En Docker, usar el host configurado en settings
            backend_host = getattr(settings, 'BACKEND_HOST', 'localhost:8000')
            scheme = 'https' if request.is_secure() else 'http'
            
            # Remover prefijo /media/ si ya existe en file_path
            clean_path = file_path
            if clean_path.startswith(settings.MEDIA_URL):
                clean_path = clean_path[len(settings.MEDIA_URL):]
                
            return f"{scheme}://{backend_host}{settings.MEDIA_URL}{clean_path}"
        else:
            # For production with S3 or when file_path already has MEDIA_URL
            if file_path.startswith(settings.MEDIA_URL):
                return file_path
            return f"{settings.MEDIA_URL}{file_path}"
    
    try:
        # Get the job and ensure it belongs to the user
        job = get_object_or_404(
            ProcessingJob, 
            id=job_id, 
            user=request.user
        )
        
        # Get all results for this job
        results = job.results.all().order_by('-created_at')
        
        # Return complete job and results data
        response_data = {
            'job': {
                'id': job.id,
                'job_type': job.job_type,
                'status': job.status,
                'prompt': job.prompt,
                'created_at': job.created_at,
                'started_at': job.started_at,
                'completed_at': job.completed_at,
                'processing_time': job.processing_time,
                'openai_parameters': job.openai_parameters,
                'error_message': job.error_message,
                'original_image': {
                    'id': job.original_image.id,
                    'title': job.original_image.title or job.original_image.original_filename,
                    'url': build_media_url(job.original_image.s3_url or str(job.original_image.original_image)),
                    'width': job.original_image.width,
                    'height': job.original_image.height,
                } if job.original_image else None,
                'style': {
                    'id': job.style.id,
                    'name': job.style.name,
                    'description': job.style.description,
                    'preview_image': job.style.preview_image,
                    'thumbnail': job.style.thumbnail,
                    'category_name': job.style.category.name,
                } if job.style else None,
            },
            'results': [
                {
                    'id': result.id,
                    'result_format': result.result_format,
                    'result_size': result.result_size,
                    'result_quality': result.result_quality,
                    'result_background': result.result_background,
                    's3_url': build_media_url(result.s3_url),
                    'user_rating': result.user_rating,
                    'is_favorite': result.is_favorite,
                    'download_count': result.download_count,
                    'created_at': result.created_at,
                    'token_usage': result.token_usage,
                }
                for result in results
            ],
            'total_results': results.count(),
            'has_results': results.exists(),
        }
        
        return Response(response_data)
        
    except Exception as e:
        return Response({
            'error': 'Failed to get job results',
            'details': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
