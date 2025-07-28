from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q
from .models import Image, ProcessedImage, ImageTag
from .serializers import (
    ImageUploadSerializer, ImageSerializer, ProcessedImageSerializer,
    ImageTagSerializer, ImageModerationSerializer
)
from .services import aws_image_service
import logging

logger = logging.getLogger(__name__)


class ImageUploadView(generics.CreateAPIView):
    """Upload new image with content moderation"""
    
    serializer_class = ImageUploadSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
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
            logger.error(f"Image upload failed: {e}")
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
        queryset = Image.objects.filter(user=user, is_content_safe=True)
        
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
        return Image.objects.filter(user=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Delete from S3 if exists
        if instance.s3_key:
            aws_image_service.delete_from_s3(instance.s3_key)
        
        # Delete processed versions from S3
        for processed in instance.processed_versions.all():
            if hasattr(processed, 'processed_image') and processed.processed_image:
                s3_key = str(processed.processed_image)
                aws_image_service.delete_from_s3(s3_key)
        
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PublicImageListView(generics.ListAPIView):
    """List public images (no authentication required)"""
    
    serializer_class = ImageSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        return Image.objects.filter(
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
        queryset = ProcessedImage.objects.filter(user=user)
        
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
        return ProcessedImage.objects.filter(user=self.request.user)
    
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


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
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


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
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


class ImageTagListView(generics.ListCreateAPIView):
    """List and create image tags"""
    
    serializer_class = ImageTagSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return ImageTag.objects.all().order_by('name')


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
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
