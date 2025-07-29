import uuid
from django.db import models
from django.conf import settings


class StyleCategory(models.Model):
    """Categories for organizing styles (Anime, Cartoon, Art, etc.)"""
    
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)
    color = models.CharField(max_length=7, default='#3B82F6')  # Hex color
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'style_categories'
        verbose_name = 'Style Category'
        verbose_name_plural = 'Style Categories'
        ordering = ['sort_order', 'name']
    
    def __str__(self):
        return self.name


class Style(models.Model):
    """Available styles for image transformation"""
    
    QUALITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]
    
    BACKGROUND_CHOICES = [
        ('auto', 'Auto'),
        ('transparent', 'Transparent'),
        ('opaque', 'Opaque'),
    ]
    
    OUTPUT_FORMAT_CHOICES = [
        ('png', 'PNG'),
        ('jpeg', 'JPEG'),
        ('webp', 'WebP'),
    ]
    
    SIZE_CHOICES = [
        ('auto', 'Auto'),
        ('1024x1024', 'Square (1024x1024)'),
        ('1536x1024', 'Landscape (1536x1024)'),
        ('1024x1536', 'Portrait (1024x1536)'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.ForeignKey(StyleCategory, on_delete=models.CASCADE, related_name='styles')
    
    # Basic information
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField()
    prompt_template = models.TextField(
        help_text="Template for OpenAI prompt. Use {original_prompt} for user input."
    )
    
    # Visual representation
    preview_image = models.URLField(max_length=500, blank=True)  # S3 URL for style preview
    thumbnail = models.URLField(max_length=500, blank=True)  # Small thumbnail
    
    # OpenAI gpt-image-1 specific parameters
    default_quality = models.CharField(max_length=10, choices=QUALITY_CHOICES, default='medium')
    default_background = models.CharField(max_length=15, choices=BACKGROUND_CHOICES, default='auto')
    default_output_format = models.CharField(max_length=10, choices=OUTPUT_FORMAT_CHOICES, default='png')
    default_size = models.CharField(max_length=15, choices=SIZE_CHOICES, default='auto')
    default_compression = models.PositiveIntegerField(default=85, help_text="0-100% compression level")
    
    # Style configuration
    supports_transparency = models.BooleanField(default=True)
    supports_streaming = models.BooleanField(default=True)
    max_prompt_length = models.PositiveIntegerField(default=1000)
    
    # Metadata
    is_active = models.BooleanField(default=True)
    is_premium = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)
    popularity_score = models.PositiveIntegerField(default=0)
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'styles'
        verbose_name = 'Style'
        verbose_name_plural = 'Styles'
        ordering = ['category__sort_order', 'sort_order', 'name']
        unique_together = ['category', 'name']
    
    def __str__(self):
        return f"{self.category.name} - {self.name}"
    
    def get_full_prompt(self, user_prompt=""):
        """Generate full prompt for OpenAI using template"""
        return self.prompt_template.format(
            original_prompt=user_prompt,
            style_name=self.name
        )


class StyleExample(models.Model):
    """Example images for each style to show users what to expect"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    style = models.ForeignKey(Style, on_delete=models.CASCADE, related_name='examples')
    
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Original and styled images
    original_image_url = models.URLField(max_length=500)  # S3 URL
    styled_image_url = models.URLField(max_length=500)   # S3 URL
    
    # Prompt used for this example
    prompt_used = models.TextField()
    
    # OpenAI parameters used
    parameters_used = models.JSONField(default=dict, blank=True)
    
    # Display settings
    is_featured = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'style_examples'
        verbose_name = 'Style Example'
        verbose_name_plural = 'Style Examples'
        ordering = ['sort_order', '-created_at']
    
    def __str__(self):
        return f"{self.style.name} - {self.title}"


class UserStylePreference(models.Model):
    """User's favorite and preferred styles"""
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='style_preferences')
    style = models.ForeignKey(Style, on_delete=models.CASCADE, related_name='user_preferences')
    
    is_favorite = models.BooleanField(default=False)
    usage_count = models.PositiveIntegerField(default=0)
    last_used = models.DateTimeField(auto_now=True)
    
    # Custom parameters for this user-style combination
    preferred_quality = models.CharField(max_length=10, blank=True)
    preferred_background = models.CharField(max_length=15, blank=True)
    preferred_output_format = models.CharField(max_length=10, blank=True)
    preferred_size = models.CharField(max_length=15, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_style_preferences'
        verbose_name = 'User Style Preference'
        verbose_name_plural = 'User Style Preferences'
        unique_together = ['user', 'style']
    
    def __str__(self):
        return f"{self.user.email} - {self.style.name}"


class StyleRating(models.Model):
    """User ratings for styles"""
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='style_ratings')
    style = models.ForeignKey(Style, on_delete=models.CASCADE, related_name='ratings')
    
    rating = models.PositiveIntegerField()  # 1-5 stars
    comment = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'style_ratings'
        verbose_name = 'Style Rating'
        verbose_name_plural = 'Style Ratings'
        unique_together = ['user', 'style']
        constraints = [
            models.CheckConstraint(
                check=models.Q(rating__gte=1) & models.Q(rating__lte=5),
                name='rating_range_check'
            )
        ]
    
    def __str__(self):
        return f"{self.user.email} rated {self.style.name}: {self.rating}/5"
