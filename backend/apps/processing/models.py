import uuid
from django.db import models
from django.conf import settings
from apps.images.models import Image
from apps.styles.models import Style


class ProcessingJob(models.Model):
    """Track image processing jobs with OpenAI gpt-image-1"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('moderating', 'Content Moderation'),
        ('processing', 'Processing with OpenAI'),
        ('streaming', 'Streaming Response'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    TYPE_CHOICES = [
        ('generation', 'Image Generation'),
        ('edit', 'Image Editing'),
        ('style_transfer', 'Style Transfer'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='processing_jobs')
    
    # Job configuration
    job_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Input data
    original_image = models.ForeignKey(Image, on_delete=models.CASCADE, null=True, blank=True, related_name='processing_jobs')
    style = models.ForeignKey(Style, on_delete=models.SET_NULL, null=True, blank=True)
    prompt = models.TextField()
    
    # OpenAI gpt-image-1 parameters used
    openai_parameters = models.JSONField(default=dict)
    
    # Visibility
    is_public = models.BooleanField(default=False, help_text="Whether results from this job are publicly visible")
    
    # Processing results
    openai_request_id = models.CharField(max_length=255, blank=True)
    openai_response = models.JSONField(default=dict, blank=True)
    
    # Content moderation
    moderation_passed = models.BooleanField(default=False)
    moderation_details = models.JSONField(default=dict, blank=True)
    moderation_checked_at = models.DateTimeField(null=True, blank=True)
    
    # Timing
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    processing_time = models.FloatField(null=True, blank=True)  # in seconds
    
    # Celery task tracking
    celery_task_id = models.CharField(max_length=255, blank=True, help_text="Celery task ID for async processing")
    
    # Error handling
    error_message = models.TextField(blank=True)
    error_details = models.JSONField(default=dict, blank=True)
    retry_count = models.PositiveIntegerField(default=0)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'processing_jobs'
        verbose_name = 'Processing Job'
        verbose_name_plural = 'Processing Jobs'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.job_type} job {self.id} - {self.status}"


class ProcessingResult(models.Model):
    """Store results from OpenAI processing"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(ProcessingJob, on_delete=models.CASCADE, related_name='results')
    
    # Result image data
    result_b64 = models.TextField()  # Base64 image data from OpenAI
    result_format = models.CharField(max_length=10)  # png, jpeg, webp
    result_size = models.CharField(max_length=20)  # 1024x1024, etc.
    result_quality = models.CharField(max_length=10)  # low, medium, high
    result_background = models.CharField(max_length=15)  # transparent, opaque
    
    # S3 storage
    s3_key = models.CharField(max_length=500, blank=True)
    s3_url = models.URLField(max_length=1000, blank=True)
    
    # OpenAI metadata
    openai_created_at = models.DateTimeField(null=True, blank=True)
    token_usage = models.JSONField(default=dict, blank=True)
    
    # User interactions
    user_rating = models.PositiveIntegerField(null=True, blank=True)  # 1-5 stars
    is_favorite = models.BooleanField(default=False)
    is_public = models.BooleanField(default=False)
    download_count = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'processing_results'
        verbose_name = 'Processing Result'
        verbose_name_plural = 'Processing Results'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Result {self.id} for job {self.job.id}"


class StreamingEvent(models.Model):
    """Store streaming events from OpenAI for real-time processing"""
    
    EVENT_TYPES = [
        ('partial_image', 'Partial Image'),
        ('completed', 'Completed'),
        ('error', 'Error'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(ProcessingJob, on_delete=models.CASCADE, related_name='streaming_events')
    
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES)
    partial_image_index = models.PositiveIntegerField(null=True, blank=True)
    
    # Event data
    b64_data = models.TextField(blank=True)
    event_metadata = models.JSONField(default=dict)
    
    # Timing
    openai_created_at = models.DateTimeField(null=True, blank=True)
    received_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'streaming_events'
        verbose_name = 'Streaming Event'
        verbose_name_plural = 'Streaming Events'
        ordering = ['received_at']
    
    def __str__(self):
        return f"{self.event_type} event for job {self.job.id}"


class UserProcessingQuota(models.Model):
    """Track user's daily processing quotas"""
    
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='processing_quota')
    
    # Daily limits
    daily_generations = models.PositiveIntegerField(default=0)
    daily_edits = models.PositiveIntegerField(default=0)
    daily_style_transfers = models.PositiveIntegerField(default=0)
    
    # Usage tracking
    last_reset_date = models.DateField(auto_now_add=True)
    total_generations = models.PositiveIntegerField(default=0)
    total_edits = models.PositiveIntegerField(default=0)
    total_style_transfers = models.PositiveIntegerField(default=0)
    
    # Cost tracking (for premium billing)
    monthly_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_processing_quotas'
        verbose_name = 'User Processing Quota'
        verbose_name_plural = 'User Processing Quotas'
    
    def __str__(self):
        return f"Processing quota for {self.user.email}"
    
    def can_process(self, job_type: str) -> bool:
        """Check if user can process based on their quota"""
        if self.user.is_premium:
            return True  # Premium users have unlimited access
        
        # Free tier limits
        daily_limit = 5  # Free users get 5 processes per day
        
        if job_type == 'generation':
            return self.daily_generations < daily_limit
        elif job_type == 'edit':
            return self.daily_edits < daily_limit
        elif job_type == 'style_transfer':
            return self.daily_style_transfers < daily_limit
        
        return False
    
    def increment_usage(self, job_type: str):
        """Increment usage count for specific job type"""
        if job_type == 'generation':
            self.daily_generations += 1
            self.total_generations += 1
        elif job_type == 'edit':
            self.daily_edits += 1
            self.total_edits += 1
        elif job_type == 'style_transfer':
            self.daily_style_transfers += 1
            self.total_style_transfers += 1
        
        self.save()


class ProcessingTemplate(models.Model):
    """Pre-configured templates for common processing tasks"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField()
    
    # Template configuration
    job_type = models.CharField(max_length=20, choices=ProcessingJob.TYPE_CHOICES)
    default_parameters = models.JSONField(default=dict)
    prompt_template = models.TextField()
    
    # Display
    preview_image = models.URLField(max_length=500, blank=True)
    category = models.CharField(max_length=50, blank=True)
    
    # Access control
    is_public = models.BooleanField(default=True)
    is_premium = models.BooleanField(default=False)
    
    # Usage stats
    usage_count = models.PositiveIntegerField(default=0)
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'processing_templates'
        verbose_name = 'Processing Template'
        verbose_name_plural = 'Processing Templates'
        ordering = ['-usage_count', 'name']
    
    def __str__(self):
        return self.name
