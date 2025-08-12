"""
Django settings for style transfer project.
"""

import os
from pathlib import Path
from decouple import config
import environ

# Initialize environment variables
env = environ.Env(
    DEBUG=(bool, False)
)

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Environment configuration
ENVIRONMENT = config('ENVIRONMENT', default='development')
IS_PRODUCTION = ENVIRONMENT == 'production'
IS_DEVELOPMENT = ENVIRONMENT == 'development'

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY', default='django-insecure-your-secret-key-here-change-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = ['*']

# Application definition
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'django_extensions',
]

LOCAL_APPS = [
    'apps.users',
    'apps.images',
    'apps.styles',
    'apps.processing',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# Custom User Model
AUTH_USER_MODEL = 'users.User'

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': config('DATABASE_NAME', default='style_transfer_db'),
        'USER': config('DATABASE_USER', default='django_user'),
        'PASSWORD': config('DATABASE_PASSWORD', default='django_password'),
        'HOST': config('DATABASE_HOST', default='localhost'),
        'PORT': config('DATABASE_PORT', default='3306'),
        'OPTIONS': {
            'sql_mode': 'traditional',
        }
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',  # Temporary for development
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# CORS settings
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CORS_ALLOW_CREDENTIALS = True

# CSRF settings - Exempt API endpoints
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# OpenAI API settings
OPENAI_API_KEY = config('OPENAI_API_KEY', default='')

# Brevo (Sendinblue) Email settings for verification
BREVO_API_KEY = config('BREVO_API_KEY', default='')
EMAIL_FROM_ADDRESS = config('EMAIL_FROM_ADDRESS', default='no-reply@example.com')
EMAIL_FROM_NAME = config('EMAIL_FROM_NAME', default='SplashMy')
EMAIL_VERIFICATION_TEMPLATE_ID = config('EMAIL_VERIFICATION_TEMPLATE_ID', default=None)
EMAIL_VERIFICATION_CODE_TTL_MINUTES = config('EMAIL_VERIFICATION_CODE_TTL_MINUTES', default=10, cast=int)
EMAIL_VERIFICATION_MAX_ATTEMPTS = config('EMAIL_VERIFICATION_MAX_ATTEMPTS', default=5, cast=int)
EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS = config('EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS', default=60, cast=int)

# File upload settings
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB

# Celery Configuration (for async tasks)
CELERY_BROKER_URL = config('CELERY_BROKER_URL', default='redis://localhost:6379')
CELERY_RESULT_BACKEND = config('CELERY_RESULT_BACKEND', default='redis://localhost:6379')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'

# Environment-based feature flags
USE_S3_STORAGE = config('USE_S3_STORAGE', default=IS_PRODUCTION, cast=bool)
USE_CONTENT_MODERATION = config('USE_CONTENT_MODERATION', default=IS_PRODUCTION, cast=bool)

# AWS Configuration (only used if S3 storage is enabled)
AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID', default='')
AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY', default='')
AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME', default='')
AWS_S3_REGION_NAME = config('AWS_S3_REGION_NAME', default='us-east-1')
AWS_S3_CUSTOM_DOMAIN = config('AWS_S3_CUSTOM_DOMAIN', default='')
AWS_DEFAULT_ACL = config('AWS_DEFAULT_ACL', default='private')
AWS_S3_OBJECT_PARAMETERS = {
    'CacheControl': 'max-age=86400',
}
AWS_LOCATION = 'media'
AWS_S3_FILE_OVERWRITE = False
AWS_QUERYSTRING_AUTH = True
AWS_QUERYSTRING_EXPIRE = 3600  # 1 hour

# Storage configuration based on environment
if USE_S3_STORAGE and AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY and AWS_STORAGE_BUCKET_NAME:
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN or f"{AWS_STORAGE_BUCKET_NAME}.s3.{AWS_S3_REGION_NAME}.amazonaws.com"}/{AWS_LOCATION}/'
else:
    # Local storage for development
    DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'

# Amazon Rekognition for content moderation
AWS_REKOGNITION_REGION = config('AWS_REKOGNITION_REGION', default='us-east-1')
CONTENT_MODERATION_CONFIDENCE_THRESHOLD = config('CONTENT_MODERATION_CONFIDENCE_THRESHOLD', default=80.0, cast=float)
ALLOWED_MODERATION_LABELS = config('ALLOWED_MODERATION_LABELS', default='Suggestive,Female_Swimwear_Or_Underwear,Male_Swimwear_Or_Underwear').split(',')

# File upload settings
MAX_UPLOAD_SIZE = config('MAX_UPLOAD_SIZE', default=10485760, cast=int)  # 10MB
ALLOWED_IMAGE_EXTENSIONS = config('ALLOWED_IMAGE_EXTENSIONS', default='jpg,jpeg,png,gif,webp').split(',')

# Rate limiting
DAILY_UPLOAD_LIMIT_FREE = config('DAILY_UPLOAD_LIMIT_FREE', default=10, cast=int)
DAILY_UPLOAD_LIMIT_PREMIUM = config('DAILY_UPLOAD_LIMIT_PREMIUM', default=100, cast=int)
