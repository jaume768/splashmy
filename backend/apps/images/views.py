from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.throttling import ScopedRateThrottle
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q
from django.conf import settings
from .models import Image, ProcessedImage, ImageTag
from .serializers import (
    ImageUploadSerializer, ImageSerializer, ProcessedImageSerializer,
    ImageTagSerializer, ImageModerationSerializer
)
from .services import aws_image_service
import logging

logger = logging.getLogger(__name__)

@method_decorator(csrf_exempt, name='dispatch')
class ImageUploadView(generics.CreateAPIView):
    """Upload new image with content moderation"""
    
    serializer_class = ImageUploadSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'images_upload'
    
    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            image = serializer.save()
            
            return Response({
                'message': 'Image uploaded successfully',
                'image': ImageSerializer(image).data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                'error': 'Failed to upload image',
                'details': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class ImageListView(generics.ListAPIView):
    """List user's images"""
    
    serializer_class = ImageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = Image.active_objects.filter(user=user, is_content_safe=True)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by tags
        tags = self.request.query_params.get('tags')
        if tags:
            tag_list = [tag.strip() for tag in tags.split(',')]
            queryset = queryset.filter(
                tag_assignments__tag__name__in=tag_list
            ).distinct()
        
        # Search by title or description
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | 
                Q(description__icontains=search) |
                Q(original_filename__icontains=search)
            )
        
        return queryset.order_by('-created_at')


class ImageDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or delete specific image"""
    
    serializer_class = ImageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Image.active_objects.filter(user=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Soft delete the image
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save(update_fields=['is_deleted', 'deleted_at'])
        
        # Also soft delete related processing jobs and results
        from apps.processing.models import ProcessingJob, ProcessingResult
        
        # Soft delete all processing jobs that use this image
        jobs = ProcessingJob.active_objects.filter(original_image=instance)
        for job in jobs:
            job.is_deleted = True
            job.deleted_at = timezone.now()
            job.save(update_fields=['is_deleted', 'deleted_at'])
            
            # Soft delete all results from these jobs
            results = ProcessingResult.active_objects.filter(job=job)
            for result in results:
                result.is_deleted = True
                result.deleted_at = timezone.now()
                result.save(update_fields=['is_deleted', 'deleted_at'])
        
        return Response({
            'message': 'Image deleted successfully'
        }, status=status.HTTP_200_OK)


class PublicImageListView(generics.ListAPIView):
    """List public images (no authentication required)"""
    
    serializer_class = ImageSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'images_public_list'
    
    def get_queryset(self):
        return Image.active_objects.filter(
            is_public=True, 
            is_content_safe=True,
            status='uploaded'
        ).order_by('-created_at')


class ProcessedImageListView(generics.ListAPIView):
    """List user's processed images"""
    
    serializer_class = ProcessedImageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        # Note: ProcessedImage model doesn't have soft delete, but filter by non-deleted original images
        queryset = ProcessedImage.objects.filter(user=user, original_image__is_deleted=False)
        
        # Filter by original image
        original_image_id = self.request.query_params.get('original_image')
        if original_image_id:
            queryset = queryset.filter(original_image_id=original_image_id)
        
        # Filter by style
        style = self.request.query_params.get('style')
        if style:
            queryset = queryset.filter(style_name__icontains=style)
        
        # Filter favorites
        favorites_only = self.request.query_params.get('favorites')
        if favorites_only and favorites_only.lower() == 'true':
            queryset = queryset.filter(is_favorite=True)
        
        return queryset.order_by('-created_at')


class ProcessedImageDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or delete specific processed image"""
    
    serializer_class = ProcessedImageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return ProcessedImage.objects.filter(user=self.request.user, original_image__is_deleted=False)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Delete from S3 if exists
        if hasattr(instance, 'processed_image') and instance.processed_image:
            s3_key = str(instance.processed_image)
            aws_image_service.delete_from_s3(s3_key)
        
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@throttle_classes([ScopedRateThrottle])
def toggle_favorite(request, pk):
    """Toggle favorite status of processed image"""
    
    try:
        processed_image = get_object_or_404(
            ProcessedImage, 
            pk=pk, 
            user=request.user
        )
        
        processed_image.is_favorite = not processed_image.is_favorite
        processed_image.save()
        
        return Response({
            'is_favorite': processed_image.is_favorite,
            'message': f"Image {'added to' if processed_image.is_favorite else 'removed from'} favorites"
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)

toggle_favorite.throttle_scope = 'images_toggle_favorite'


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@throttle_classes([ScopedRateThrottle])
def rate_processed_image(request, pk):
    """Rate a processed image (1-5 stars)"""
    
    try:
        rating = request.data.get('rating')
        
        if not rating or not isinstance(rating, int) or rating < 1 or rating > 5:
            return Response({
                'error': 'Rating must be an integer between 1 and 5'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        processed_image = get_object_or_404(
            ProcessedImage, 
            pk=pk, 
            user=request.user
        )
        
        processed_image.user_rating = rating
        processed_image.save()
        
        return Response({
            'rating': rating,
            'message': 'Rating saved successfully'
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)

rate_processed_image.throttle_scope = 'images_rate'


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@throttle_classes([ScopedRateThrottle])
def download_image(request, pk):
    """Generate download URL for image"""
    
    try:
        # Try to find in regular images first
        try:
            image = get_object_or_404(Image, pk=pk, user=request.user)
            s3_key = image.s3_key
        except:
            # Try processed images
            processed_image = get_object_or_404(
                ProcessedImage, 
                pk=pk, 
                user=request.user
            )
            s3_key = str(processed_image.processed_image)
            # Increment download count
            processed_image.download_count += 1
            processed_image.save()
        
        if not s3_key:
            return Response({
                'error': 'Image not found in storage'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Generate long-lived presigned URL for download
        download_url = aws_image_service.generate_presigned_url(
            s3_key, 
            expiration=3600  # 1 hour
        )
        
        if not download_url:
            return Response({
                'error': 'Failed to generate download URL'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'download_url': download_url,
            'expires_in': 3600
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)

download_image.throttle_scope = 'images_download'


class ImageTagListView(generics.ListCreateAPIView):
    """List and create image tags"""
    
    serializer_class = ImageTagSerializer
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'images_tags_list'
    
    def get_queryset(self):
        return ImageTag.objects.all().order_by('name')


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@throttle_classes([ScopedRateThrottle])
def user_stats(request):
    """Get user's image statistics"""
    
    user = request.user
    today = timezone.now().date()
    
    stats = {
        'total_images': Image.objects.filter(user=user).count(),
        'safe_images': Image.objects.filter(user=user, is_content_safe=True).count(),
        'processed_images': ProcessedImage.objects.filter(user=user).count(),
        'favorite_processed': ProcessedImage.objects.filter(user=user, is_favorite=True).count(),
        'today_uploads': Image.objects.filter(user=user, created_at__date=today).count(),
        'storage_used_mb': sum(
            img.file_size for img in Image.objects.filter(user=user)
        ) / (1024 * 1024),
        'daily_limit': (
            settings.DAILY_UPLOAD_LIMIT_PREMIUM 
            if user.is_premium 
            else settings.DAILY_UPLOAD_LIMIT_FREE
        ),
        'is_premium': user.is_premium
    }
    
    return Response(stats)

user_stats.throttle_scope = 'images_stats'

# Admin views for content moderation
class ImageModerationListView(generics.ListAPIView):
    """List images for moderation (admin only)"""
    
    serializer_class = ImageModerationSerializer
    permission_classes = [permissions.IsAdminUser]
    
    def get_queryset(self):
        return Image.objects.filter(
            is_content_safe=False
        ).order_by('-created_at')


@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def approve_image(request, pk):
    """Approve flagged image (admin only)"""
    
    try:
        image = get_object_or_404(Image, pk=pk)
        image.is_content_safe = True
        image.save()
        
        return Response({
            'message': 'Image approved successfully'
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


import mimetypes
from django.http import HttpResponse, Http404, FileResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404
import os
from django.conf import settings

@require_http_methods(["GET"])
@csrf_exempt
def serve_media_file(request, file_path):
    """
    Securely serve media files with authentication and authorization checks
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Build the full file path
        full_path = os.path.join(settings.MEDIA_ROOT, file_path)
        
        # Security: Prevent directory traversal attacks
        if not os.path.normpath(full_path).startswith(os.path.normpath(settings.MEDIA_ROOT)):
            raise Http404("Access denied")
        
        # Check if file exists
        if not os.path.exists(full_path):
            raise Http404("File not found")
        
        # Additional security checks based on file type/location
        if file_path.startswith('processed/'):
            # For processed images, check if user owns the result or it's public
            from apps.processing.models import ProcessingResult
            
            try:
                # Find the result by s3_key
                result = ProcessingResult.objects.select_related('job__user').filter(
                    s3_key=file_path
                ).first()
                
                if not result:
                    raise Http404("File not found in database")
                
                # Allow if user is authenticated and owns this result
                if request.user.is_authenticated and result.job.user == request.user:
                    pass  # User can access their own files (public or private)
                # Allow if it's a public result (regardless of authentication)
                elif result.is_public:
                    pass  # Anyone can access public files
                else:
                    raise Http404("Access denied")
                    
            except ProcessingResult.DoesNotExist:
                raise Http404("File not found in database")
            except Exception as e:
                logger.error(f"Error checking result ownership: {str(e)}")
                raise Http404("Access denied")
        
        elif file_path.startswith('images/uploads/'):
            # For original uploads, require authentication and ownership
            if not request.user.is_authenticated:
                raise Http404("Authentication required")
                
            path_parts = file_path.split('/')
            if len(path_parts) >= 3:
                user_id = path_parts[2]
                if str(request.user.id) != user_id:
                    # Check if user owns this image
                    from apps.images.models import Image
                    image_id = os.path.splitext(os.path.basename(file_path))[0]
                    
                    try:
                        image = Image.objects.get(id=image_id, user=request.user)
                    except:
                        raise Http404("Access denied")
        
        # Determine content type
        content_type, _ = mimetypes.guess_type(full_path)
        if not content_type:
            content_type = 'application/octet-stream'
        
        # Serve the file with security headers
        response = FileResponse(
            open(full_path, 'rb'),
            content_type=content_type,
            as_attachment=False
        )
        
        # Security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['Cache-Control'] = 'private, max-age=3600'
        
        # Set proper filename for downloads
        filename = os.path.basename(file_path)
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        
        return response
        
    except FileNotFoundError:
        raise Http404("File not found")
    except PermissionError:
        raise Http404("Access denied")
    except Exception as e:
        # Log the error but don't expose details
        logger.error(f"Media serve error: {str(e)}")
        raise Http404("File not found")


@api_view(['GET', 'HEAD'])
@permission_classes([permissions.IsAuthenticated])
def authenticated_media_proxy(request, file_path):
    """
    Authenticated media proxy for serving private images to logged-in users
    This endpoint requires authentication and can serve images via API calls with tokens
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Build the full file path
        full_path = os.path.join(settings.MEDIA_ROOT, file_path)
        
        # Security: Prevent directory traversal attacks
        if not os.path.normpath(full_path).startswith(os.path.normpath(settings.MEDIA_ROOT)):
            raise Http404("Access denied")
        
        # Check if file exists
        if not os.path.exists(full_path):
            raise Http404("File not found")
        
        # Additional security checks based on file type/location
        if file_path.startswith('processed/'):
            # For processed images, check if user owns the result or it's public
            from apps.processing.models import ProcessingResult
            
            try:
                # Find the result by s3_key
                result = ProcessingResult.objects.select_related('job__user').filter(
                    s3_key=file_path
                ).first()
                
                if not result:
                    raise Http404("File not found in database")
                
                # Allow if user owns this result
                if result.job.user == request.user:
                    pass  # User can access their own files (public or private)
                # Allow if it's a public result
                elif result.is_public:
                    pass  # Anyone can access public files
                else:
                    raise Http404("Access denied")
                    
            except ProcessingResult.DoesNotExist:
                raise Http404("File not found in database")
            except Exception as e:
                logger.error(f"Error checking result ownership: {str(e)}")
                raise Http404("Access denied")
        
        elif file_path.startswith('images/uploads/'):
            # For original uploads, require ownership
            from apps.images.models import Image
            path_parts = file_path.split('/')
            if len(path_parts) >= 3:
                user_id = path_parts[2]
                if str(request.user.id) != user_id:
                    # Check if user owns this image
                    image_id = os.path.splitext(os.path.basename(file_path))[0]
                    
                    try:
                        image = Image.objects.get(id=image_id, user=request.user)
                    except:
                        raise Http404("Access denied")
        
        # Determine content type
        content_type, _ = mimetypes.guess_type(full_path)
        if not content_type:
            content_type = 'application/octet-stream'
        
        # Serve the file with security headers
        response = FileResponse(
            open(full_path, 'rb'),
            content_type=content_type,
            as_attachment=False
        )
        
        # Security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['Cache-Control'] = 'private, max-age=3600'
        
        # Set proper filename for downloads
        filename = os.path.basename(file_path)
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        
        return response
        
    except FileNotFoundError:
        raise Http404("File not found")
    except PermissionError:
        raise Http404("Access denied")
    except Exception as e:
        # Log the error but don't expose details
        logger.error(f"Authenticated media proxy error: {str(e)}")
        raise Http404("File not found")
