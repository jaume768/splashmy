from rest_framework import serializers
from .models import StyleCategory, Style, StyleExample, UserStylePreference, StyleRating


class StyleCategorySerializer(serializers.ModelSerializer):
    """Serializer for style categories"""
    
    styles_count = serializers.SerializerMethodField()
    
    class Meta:
        model = StyleCategory
        fields = [
            'id', 'name', 'slug', 'description', 'icon', 'color',
            'is_active', 'sort_order', 'styles_count'
        ]
    
    def get_styles_count(self, obj):
        """Get count of active styles in this category"""
        return obj.styles.filter(is_active=True).count()


class StyleExampleSerializer(serializers.ModelSerializer):
    """Serializer for style examples"""
    
    class Meta:
        model = StyleExample
        fields = [
            'id', 'title', 'description', 'original_image_url',
            'styled_image_url', 'prompt_used', 'parameters_used',
            'is_featured', 'sort_order'
        ]


class StyleSerializer(serializers.ModelSerializer):
    """Detailed serializer for styles"""
    
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    examples = StyleExampleSerializer(many=True, read_only=True)
    average_rating = serializers.SerializerMethodField()
    total_ratings = serializers.SerializerMethodField()
    user_rating = serializers.SerializerMethodField()
    is_user_favorite = serializers.SerializerMethodField()
    
    class Meta:
        model = Style
        fields = [
            'id', 'name', 'slug', 'description', 'prompt_template',
            'category', 'category_name', 'category_slug',
            'preview_image', 'thumbnail',
            'default_quality', 'default_background', 'default_output_format',
            'default_size', 'default_compression',
            'supports_transparency', 'supports_streaming', 'max_prompt_length',
            'is_active', 'is_premium', 'sort_order', 'popularity_score',
            'examples', 'average_rating', 'total_ratings',
            'user_rating', 'is_user_favorite', 'created_at'
        ]
        read_only_fields = ['popularity_score', 'created_at']
    
    def get_average_rating(self, obj):
        """Get average rating for this style"""
        ratings = obj.ratings.all()
        if ratings:
            return sum(r.rating for r in ratings) / len(ratings)
        return 0
    
    def get_total_ratings(self, obj):
        """Get total number of ratings"""
        return obj.ratings.count()
    
    def get_user_rating(self, obj):
        """Get current user's rating for this style"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                rating = obj.ratings.get(user=request.user)
                return rating.rating
            except StyleRating.DoesNotExist:
                pass
        return None
    
    def get_is_user_favorite(self, obj):
        """Check if style is user's favorite"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                preference = obj.user_preferences.get(user=request.user)
                return preference.is_favorite
            except UserStylePreference.DoesNotExist:
                pass
        return False


class StyleListSerializer(serializers.ModelSerializer):
    """Simplified serializer for style lists"""
    
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_color = serializers.CharField(source='category.color', read_only=True)
    average_rating = serializers.SerializerMethodField()
    is_user_favorite = serializers.SerializerMethodField()
    
    class Meta:
        model = Style
        fields = [
            'id', 'name', 'slug', 'description', 'category_name', 'category_color',
            'preview_image', 'thumbnail', 'is_premium', 'popularity_score',
            'average_rating', 'is_user_favorite'
        ]
    
    def get_average_rating(self, obj):
        """Get average rating for this style"""
        ratings = obj.ratings.all()
        if ratings:
            return round(sum(r.rating for r in ratings) / len(ratings), 1)
        return 0
    
    def get_is_user_favorite(self, obj):
        """Check if style is user's favorite"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                preference = obj.user_preferences.get(user=request.user)
                return preference.is_favorite
            except UserStylePreference.DoesNotExist:
                pass
        return False


class UserStylePreferenceSerializer(serializers.ModelSerializer):
    """Serializer for user style preferences"""
    
    style_name = serializers.CharField(source='style.name', read_only=True)
    style_slug = serializers.CharField(source='style.slug', read_only=True)
    style_thumbnail = serializers.CharField(source='style.thumbnail', read_only=True)
    category_name = serializers.CharField(source='style.category.name', read_only=True)
    
    class Meta:
        model = UserStylePreference
        fields = [
            'id', 'style', 'style_name', 'style_slug', 'style_thumbnail',
            'category_name', 'is_favorite', 'usage_count', 'last_used',
            'preferred_quality', 'preferred_background', 'preferred_output_format',
            'preferred_size', 'created_at'
        ]
        read_only_fields = ['usage_count', 'last_used', 'created_at']


class StyleRatingSerializer(serializers.ModelSerializer):
    """Serializer for style ratings"""
    
    style_name = serializers.CharField(source='style.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = StyleRating
        fields = [
            'id', 'style', 'style_name', 'user_email', 'rating',
            'comment', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user_email', 'created_at', 'updated_at']
    
    def validate_rating(self, value):
        """Validate rating is between 1-5"""
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5")
        return value


class StyleProcessingParametersSerializer(serializers.Serializer):
    """Serializer for style processing parameters for OpenAI gpt-image-1"""
    
    style_id = serializers.UUIDField()
    prompt = serializers.CharField(max_length=32000)  # gpt-image-1 limit
    
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
    
    def validate_style_id(self, value):
        """Validate style exists and is active"""
        try:
            style = Style.objects.get(id=value, is_active=True)
            return value
        except Style.DoesNotExist:
            raise serializers.ValidationError("Style not found or inactive")
    
    def validate_prompt(self, value):
        """Validate prompt length based on style"""
        if len(value.strip()) == 0:
            raise serializers.ValidationError("Prompt cannot be empty")
        return value.strip()
    
    def validate(self, attrs):
        """Cross-field validation"""
        # If background is transparent, format should support transparency
        if attrs.get('background') == 'transparent':
            output_format = attrs.get('output_format', 'png')
            if output_format not in ['png', 'webp']:
                raise serializers.ValidationError(
                    "Transparent background requires PNG or WebP format"
                )
        
        return attrs
