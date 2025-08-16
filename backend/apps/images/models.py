import os
import uuid
from django.db import models
from django.conf import settings
from PIL import Image as PILImage


def upload_to_images(instance, filename):
    """Generate S3 upload path for user images"""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return f"images/uploads/{instance.user.id}/{filename}"


def upload_to_processed(instance, filename):
    """Generate S3 upload path for processed images"""
    ext = filename.split('.')[-1]
    filename = f"processed_{uuid.uuid4()}.{ext}"
    return f"images/processed/{instance.user.id}/{filename}"


class ActiveImageManager(models.Manager):
    """Manager that only returns non-deleted images"""
    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)


class Image(models.Model):
    """Model for uploaded images"""
    
    STATUS_CHOICES = [
        ('uploaded', 'Uploaded'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='images')
    title = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    
    # Original image
    original_image = models.ImageField(upload_to=upload_to_images)
    original_filename = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField()  # in bytes
    width = models.PositiveIntegerField()
    height = models.PositiveIntegerField()
    format = models.CharField(max_length=10)  # JPEG, PNG, etc.
    
    # Processing status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='uploaded')
    processing_started_at = models.DateTimeField(null=True, blank=True)
    processing_completed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    
    # Content moderation
    is_content_safe = models.BooleanField(default=False)
    moderation_result = models.JSONField(default=dict, blank=True)
    moderation_checked_at = models.DateTimeField(null=True, blank=True)
    
    # S3 storage details
    s3_key = models.CharField(max_length=500, blank=True)
    s3_url = models.URLField(max_length=1000, blank=True)
    s3_bucket = models.CharField(max_length=255, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_public = models.BooleanField(default=False)
    
    # Soft delete
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    # Managers
    objects = models.Manager()  # Default manager (includes deleted)
    active_objects = ActiveImageManager()  # Only non-deleted
    
    class Meta:
        db_table = 'images'
        verbose_name = 'Image'
        verbose_name_plural = 'Images'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title or self.original_filename} by {self.user.email}"
    
    def save(self, *args, **kwargs):
        if self.original_image and not self.width:
            # Extract image metadata
            with PILImage.open(self.original_image) as img:
                self.width, self.height = img.size
                self.format = img.format
            
            # Set original filename and file size
            if not self.original_filename:
                self.original_filename = self.original_image.name
            self.file_size = self.original_image.size
            
        super().save(*args, **kwargs)


class ProcessedImage(models.Model):
    """Model for processed/styled images"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    original_image = models.ForeignKey(Image, on_delete=models.CASCADE, related_name='processed_versions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='processed_images')
    
    # Style information
    style_name = models.CharField(max_length=100)
    style_prompt = models.TextField()
    
    # Processed image
    processed_image = models.ImageField(upload_to=upload_to_processed)
    processing_time = models.FloatField(null=True, blank=True)  # in seconds
    
    # AI processing details
    openai_request_id = models.CharField(max_length=255, blank=True)
    openai_model_used = models.CharField(max_length=100, default='gpt-image-1')
    processing_parameters = models.JSONField(default=dict, blank=True)
    
    # Quality metrics
    similarity_score = models.FloatField(null=True, blank=True)
    user_rating = models.PositiveIntegerField(null=True, blank=True)  # 1-5 stars
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_favorite = models.BooleanField(default=False)
    download_count = models.PositiveIntegerField(default=0)
    
    class Meta:
        db_table = 'processed_images'
        verbose_name = 'Processed Image'
        verbose_name_plural = 'Processed Images'
        ordering = ['-created_at']
        unique_together = ['original_image', 'style_name', 'user']
    
    def __str__(self):
        return f"{self.style_name} style of {self.original_image.title or self.original_image.original_filename}"


class ImageTag(models.Model):
    """Model for image tags"""
    
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'image_tags'
        verbose_name = 'Image Tag'
        verbose_name_plural = 'Image Tags'
        ordering = ['name']
    
    def __str__(self):
        return self.name


class ImageTagAssignment(models.Model):
    """Many-to-many relationship between images and tags"""
    
    image = models.ForeignKey(Image, on_delete=models.CASCADE, related_name='tag_assignments')
    tag = models.ForeignKey(ImageTag, on_delete=models.CASCADE, related_name='image_assignments')
    confidence = models.FloatField(default=1.0)  # For AI-generated tags
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'image_tag_assignments'
        unique_together = ['image', 'tag']
        verbose_name = 'Image Tag Assignment'
        verbose_name_plural = 'Image Tag Assignments'
