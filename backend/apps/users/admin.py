from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import User, UserProfile


class UserProfileInline(admin.StackedInline):
    """Inline admin for UserProfile to show in User admin"""
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile Information'
    fields = (
        'bio', 'preferred_styles', 'max_daily_processes'
    )


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom User admin with enhanced display"""
    
    # Display in list view
    list_display = (
        'email', 'username', 'first_name', 'last_name', 
        'is_premium', 'processing_count', 'is_active', 
        'is_staff', 'date_joined', 'avatar_preview'
    )
    
    list_filter = (
        'is_active', 'is_staff', 'is_superuser', 'is_premium',
        'date_joined', 'last_login'
    )
    
    # Search fields
    search_fields = ('email', 'username', 'first_name', 'last_name')
    
    # Fields to display when viewing/editing a user
    fieldsets = (
        ('Authentication', {
            'fields': ('email', 'username', 'password')
        }),
        ('Personal Information', {
            'fields': ('first_name', 'last_name', 'avatar')
        }),
        ('Premium & Processing', {
            'fields': ('is_premium', 'processing_count'),
            'classes': ('collapse',)
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
            'classes': ('collapse',)
        }),
        ('Important Dates', {
            'fields': ('last_login', 'date_joined'),
            'classes': ('collapse',)
        }),
    )
    
    # Fields for adding new user
    add_fieldsets = (
        ('Required Information', {
            'classes': ('wide',),
            'fields': ('email', 'username', 'password1', 'password2'),
        }),
        ('Optional Information', {
            'classes': ('wide', 'collapse'),
            'fields': ('first_name', 'last_name', 'is_premium'),
        }),
    )
    
    # Ordering
    ordering = ('-date_joined',)
    
    # Inline profiles
    inlines = [UserProfileInline]
    
    # Actions
    actions = ['make_premium', 'remove_premium', 'reset_processing_count']
    
    def avatar_preview(self, obj):
        """Show avatar preview in admin list"""
        if obj.avatar:
            return format_html(
                '<img src="{}" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;" />',
                obj.avatar.url
            )
        return "No Avatar"
    avatar_preview.short_description = 'Avatar'
    
    def make_premium(self, request, queryset):
        """Action to make selected users premium"""
        updated = queryset.update(is_premium=True)
        self.message_user(request, f'{updated} users were successfully made premium.')
    make_premium.short_description = "Mark selected users as premium"
    
    def remove_premium(self, request, queryset):
        """Action to remove premium from selected users"""
        updated = queryset.update(is_premium=False)
        self.message_user(request, f'{updated} users were successfully removed from premium.')
    remove_premium.short_description = "Remove premium from selected users"
    
    def reset_processing_count(self, request, queryset):
        """Action to reset processing count"""
        updated = queryset.update(processing_count=0)
        self.message_user(request, f'Processing count reset for {updated} users.')
    reset_processing_count.short_description = "Reset processing count to 0"


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """Admin for UserProfile model"""
    
    list_display = (
        'user_email', 'user_username', 'max_daily_processes', 
        'preferred_styles_count', 'created_at'
    )
    
    list_filter = ('created_at', 'max_daily_processes')
    
    search_fields = (
        'user__email', 'user__username', 'user__first_name', 
        'user__last_name', 'bio'
    )
    
    fields = (
        'user', 'bio', 'preferred_styles', 'max_daily_processes',
        'created_at', 'updated_at'
    )
    
    readonly_fields = ('created_at', 'updated_at')
    
    ordering = ('-created_at',)
    
    def user_email(self, obj):
        """Display user email in profile list"""
        return obj.user.email
    user_email.short_description = 'Email'
    user_email.admin_order_field = 'user__email'
    
    def user_username(self, obj):
        """Display username in profile list"""
        return obj.user.username
    user_username.short_description = 'Username'
    user_username.admin_order_field = 'user__username'
    
    def preferred_styles_count(self, obj):
        """Display count of preferred styles"""
        return len(obj.preferred_styles) if obj.preferred_styles else 0
    preferred_styles_count.short_description = 'Preferred Styles Count'
    preferred_styles_count.admin_order_field = 'preferred_styles'


# Customize admin site headers
admin.site.site_header = "Fotomorfia Administration"
admin.site.site_title = "Fotomorfia Admin"
admin.site.index_title = "Welcome to Fotomorfia Administration"
