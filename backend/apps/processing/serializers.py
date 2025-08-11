from rest_framework import serializers
from django.utils import timezone
from .models import ProcessingJob, ProcessingResult, StreamingEvent, UserProcessingQuota, ProcessingTemplate
from apps.styles.models import Style
from apps.images.models import Image


class ProcessingJobCreateSerializer(serializers.Serializer):
    """Serializer for creating processing jobs"""
    
    JOB_TYPE_CHOICES = [
        ('generation', 'Image Generation'),
        ('edit', 'Image Editing'),
        ('style_transfer', 'Style Transfer'),
    ]
    
    job_type = serializers.ChoiceField(choices=JOB_TYPE_CHOICES)
    prompt = serializers.CharField(max_length=32000)  # gpt-image-1 limit
    
    # Optional inputs
    original_image_id = serializers.UUIDField(required=False, allow_null=True)
    style_id = serializers.UUIDField(required=False, allow_null=True)
    
    # OpenAI gpt-image-1 parameters
    quality = serializers.ChoiceField(
        choices=['auto', 'low', 'medium', 'high'],
        default='auto',
        required=False
    )
    background = serializers.ChoiceField(
        choices=['auto', 'transparent', 'opaque'],
        default='auto',
        required=False
    )
    output_format = serializers.ChoiceField(
        choices=['png', 'jpeg', 'webp'],
        default='png',
        required=False
    )
    size = serializers.ChoiceField(
        choices=['auto', '1024x1024', '1536x1024', '1024x1536'],
        default='auto',
        required=False
    )
    output_compression = serializers.IntegerField(
        min_value=0,
        max_value=100,
        default=85,
        required=False
    )
    n = serializers.IntegerField(
        min_value=1,
        max_value=10,
        default=1,
        required=False
    )
    stream = serializers.BooleanField(default=False, required=False)
    moderation = serializers.ChoiceField(
        choices=['auto', 'low'],
        default='auto',
        required=False
    )
    input_fidelity = serializers.ChoiceField(
        choices=['low', 'high'],
        default='low',
        required=False
    )
    partial_images = serializers.IntegerField(
        min_value=0,
        max_value=3,
        default=0,
        required=False
    )
    is_public = serializers.BooleanField(default=False, required=False)
    
    def validate_original_image_id(self, value):
        """Validate original image exists for edit jobs"""
        if value:
            try:
                image = Image.objects.get(id=value, user=self.context['request'].user)
                if not image.is_content_safe:
                    raise serializers.ValidationError("Original image failed content moderation")
                return value
            except Image.DoesNotExist:
                raise serializers.ValidationError("Original image not found")
        return value
    
    def validate_style_id(self, value):
        """Validate style exists and is active"""
        if value:
            try:
                style = Style.objects.get(id=value, is_active=True)
                return value
            except Style.DoesNotExist:
                raise serializers.ValidationError("Style not found or inactive")
        return value
    
    def validate(self, attrs):
        """Cross-field validation"""
        job_type = attrs.get('job_type')
        
        # Edit jobs require original image
        if job_type == 'edit' and not attrs.get('original_image_id'):
            raise serializers.ValidationError("Edit jobs require an original image")
        
        # Style transfer requires both image and style
        if job_type == 'style_transfer':
            if not attrs.get('original_image_id'):
                raise serializers.ValidationError("Style transfer requires an original image")
            if not attrs.get('style_id'):
                raise serializers.ValidationError("Style transfer requires a style")
        
        # Transparent background requires compatible format
        if attrs.get('background') == 'transparent':
            output_format = attrs.get('output_format', 'png')
            if output_format not in ['png', 'webp']:
                raise serializers.ValidationError(
                    "Transparent background requires PNG or WebP format"
                )
        
        return attrs


class ProcessingJobSerializer(serializers.ModelSerializer):
    """Serializer for processing job display"""
    
    user_email = serializers.CharField(source='user.email', read_only=True)
    original_image_title = serializers.CharField(source='original_image.title', read_only=True)
    style_name = serializers.CharField(source='style.name', read_only=True)
    results_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ProcessingJob
        fields = [
            'id', 'user_email', 'job_type', 'status', 'prompt',
            'original_image', 'original_image_title', 'style', 'style_name',
            'openai_parameters', 'openai_request_id',
            'moderation_passed', 'moderation_checked_at',
            'started_at', 'completed_at', 'processing_time',
            'error_message', 'retry_count', 'results_count', 'is_public',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user_email', 'openai_request_id', 'moderation_passed',
            'moderation_checked_at', 'started_at', 'completed_at',
            'processing_time', 'error_message', 'retry_count',
            'created_at', 'updated_at'
        ]
    
    def get_results_count(self, obj):
        """Get count of processing results"""
        return obj.results.count()


class ProcessingResultSerializer(serializers.ModelSerializer):
    """Serializer for processing results"""
    
    job_type = serializers.CharField(source='job.job_type', read_only=True)
    job_prompt = serializers.CharField(source='job.prompt', read_only=True)
    signed_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ProcessingResult
        fields = [
            'id', 'job', 'job_type', 'job_prompt',
            'result_format', 'result_size', 'result_quality', 'result_background',
            's3_url', 'signed_url', 'openai_created_at', 'token_usage',
            'user_rating', 'is_favorite', 'is_public', 'download_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'job_type', 'job_prompt', 'result_format', 'result_size',
            'result_quality', 'result_background', 's3_url', 'signed_url',
            'openai_created_at', 'token_usage', 'download_count',
            'created_at', 'updated_at'
        ]
    
    def get_signed_url(self, obj):
        """Get signed URL for result image"""
        if obj.s3_key:
            from apps.images.services import aws_image_service
            return aws_image_service.generate_presigned_url(obj.s3_key)
        return None


class StreamingEventSerializer(serializers.ModelSerializer):
    """Serializer for streaming events"""
    
    class Meta:
        model = StreamingEvent
        fields = [
            'id', 'job', 'event_type', 'partial_image_index',
            'b64_data', 'event_metadata', 'openai_created_at', 'received_at'
        ]


class UserProcessingQuotaSerializer(serializers.ModelSerializer):
    """Serializer for user processing quota"""
    
    user_email = serializers.CharField(source='user.email', read_only=True)
    is_premium = serializers.CharField(source='user.is_premium', read_only=True)
    can_generate = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    can_style_transfer = serializers.SerializerMethodField()
    
    class Meta:
        model = UserProcessingQuota
        fields = [
            'user_email', 'is_premium',
            'daily_generations', 'daily_edits', 'daily_style_transfers',
            'total_generations', 'total_edits', 'total_style_transfers',
            'monthly_cost', 'last_reset_date',
            'can_generate', 'can_edit', 'can_style_transfer',
            'updated_at'
        ]
        read_only_fields = [
            'user_email', 'is_premium', 'total_generations', 'total_edits',
            'total_style_transfers', 'monthly_cost', 'last_reset_date',
            'can_generate', 'can_edit', 'can_style_transfer', 'updated_at'
        ]
    
    def get_can_generate(self, obj):
        """Check if user can generate images"""
        return obj.can_process('generation')
    
    def get_can_edit(self, obj):
        """Check if user can edit images"""
        return obj.can_process('edit')
    
    def get_can_style_transfer(self, obj):
        """Check if user can do style transfer"""
        return obj.can_process('style_transfer')


class ProcessingTemplateSerializer(serializers.ModelSerializer):
    """Serializer for processing templates"""
    
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    
    class Meta:
        model = ProcessingTemplate
        fields = [
            'id', 'name', 'description', 'job_type', 'default_parameters',
            'prompt_template', 'preview_image', 'category',
            'is_public', 'is_premium', 'usage_count',
            'created_by', 'created_by_email', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'usage_count', 'created_by', 'created_by_email',
            'created_at', 'updated_at'
        ]


class ProcessingStatsSerializer(serializers.Serializer):
    """Serializer for processing statistics"""
    
    total_jobs = serializers.IntegerField()
    completed_jobs = serializers.IntegerField()
    failed_jobs = serializers.IntegerField()
    pending_jobs = serializers.IntegerField()
    
    total_generations = serializers.IntegerField()
    total_edits = serializers.IntegerField()
    total_style_transfers = serializers.IntegerField()
    
    average_processing_time = serializers.FloatField()
    total_processing_time = serializers.FloatField()
    
    quota_info = UserProcessingQuotaSerializer()
    
    # Recent activity
    recent_jobs = ProcessingJobSerializer(many=True)
    recent_results = ProcessingResultSerializer(many=True)
