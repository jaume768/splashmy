from django.contrib import admin
from .models import StyleCategory, Style, StyleExample, UserStylePreference, StyleRating

@admin.register(StyleCategory)
class StyleCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'is_active', 'sort_order', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    list_editable = ['is_active', 'sort_order']
    prepopulated_fields = {'slug': ('name',)}
    ordering = ['sort_order', 'name']


@admin.register(Style)
class StyleAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'category', 'is_active', 'is_premium', 
        'popularity_score', 'sort_order', 'created_at'
    ]
    list_filter = [
        'is_active', 'is_premium', 'category', 
        'default_quality', 'created_at'
    ]
    search_fields = ['name', 'description', 'prompt_template']
    list_editable = ['is_active', 'is_premium', 'sort_order']
    prepopulated_fields = {'slug': ('name',)}
    ordering = ['category__sort_order', 'sort_order', 'name']
    
    fieldsets = (
        ('Basic Information', {
            'fields': (
                'name', 'slug', 'category', 'description', 
                'prompt_template'
            )
        }),
        ('Visual Assets', {
            'fields': ('preview_image', 'thumbnail')
        }),
        ('OpenAI Parameters', {
            'fields': (
                'default_quality', 'default_background', 
                'default_output_format', 'default_size', 
                'default_compression'
            )
        }),
        ('Configuration', {
            'fields': (
                'supports_transparency', 'supports_streaming', 
                'max_prompt_length'
            )
        }),
        ('Status & Metadata', {
            'fields': (
                'is_active', 'is_premium', 'sort_order', 
                'popularity_score', 'created_by'
            )
        })
    )
    
    readonly_fields = ['popularity_score']


@admin.register(StyleExample)
class StyleExampleAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'style', 'is_featured', 'sort_order', 'created_at'
    ]
    list_filter = ['is_featured', 'style__category', 'created_at']
    search_fields = ['title', 'description', 'prompt_used']
    list_editable = ['is_featured', 'sort_order']
    ordering = ['style__category', 'style', 'sort_order']


@admin.register(UserStylePreference)
class UserStylePreferenceAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'style', 'is_favorite', 'usage_count', 
        'last_used', 'created_at'
    ]
    list_filter = [
        'is_favorite', 'style__category', 'preferred_quality', 
        'created_at'
    ]
    search_fields = ['user__email', 'style__name']
    readonly_fields = ['usage_count', 'last_used']
    ordering = ['-last_used']


@admin.register(StyleRating)
class StyleRatingAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'style', 'rating', 'created_at', 'updated_at'
    ]
    list_filter = ['rating', 'style__category', 'created_at']
    search_fields = ['user__email', 'style__name', 'comment']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'style')
