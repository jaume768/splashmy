from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    """Custom manager for User model with email as username"""
    
    def create_user(self, email, username, password=None, **extra_fields):
        """Create and save a regular User with the given email and password."""
        if not email:
            raise ValueError('The Email field must be set')
        if not username:
            raise ValueError('The Username field must be set')
            
        email = self.normalize_email(email)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, username, password=None, **extra_fields):
        """Create and save a SuperUser with the given email and password."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
            
        return self.create_user(email, username, password, **extra_fields)


class User(AbstractUser):
    """Extended User model with additional fields for style transfer app"""
    
    email = models.EmailField(unique=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_premium = models.BooleanField(default=False)
    processing_count = models.PositiveIntegerField(default=0)
    # Email verification status
    is_email_verified = models.BooleanField(default=False)
    
    # Fix reverse accessor conflicts
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to.',
        related_name='style_transfer_users',
        related_query_name='style_transfer_user',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name='style_transfer_users',
        related_query_name='style_transfer_user',
    )
    
    # Custom manager
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return self.email



class UserProfile(models.Model):
    """Additional user profile information"""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(max_length=500, blank=True)
    preferred_styles = models.JSONField(default=list, blank=True)
    max_daily_processes = models.PositiveIntegerField(default=10)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_profiles'
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'
    
    def __str__(self):
        return f"{self.user.email}'s Profile"


class EmailVerification(models.Model):
    """Stores hashed email verification codes for users (OTP)."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='email_verifications')
    code_hash = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempts = models.PositiveIntegerField(default=0)
    last_sent_at = models.DateTimeField(null=True, blank=True)
    resend_count = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'email_verifications'
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['expires_at']),
        ]
        verbose_name = 'Email Verification'
        verbose_name_plural = 'Email Verifications'

    def __str__(self):
        return f"EmailVerification(user={self.user_id}, expires_at={self.expires_at})"
