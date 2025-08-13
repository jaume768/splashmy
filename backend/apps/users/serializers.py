from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.contrib.auth import authenticate
from .models import User, UserProfile
from . import services
from django.conf import settings


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile"""
    
    class Meta:
        model = UserProfile
        fields = ['bio', 'preferred_styles', 'max_daily_processes']


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user model"""
    
    profile = UserProfileSerializer(read_only=True)
    password = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'avatar', 'is_premium', 'processing_count', 'profile',
            'password', 'created_at'
        ]
        read_only_fields = ['id', 'processing_count', 'created_at']
    
    def create(self, validated_data):
        """Create user with encrypted password using custom manager"""
        password = validated_data.pop('password')
        email = validated_data.pop('email')
        username = validated_data.pop('username')
        first_name = validated_data.pop('first_name', '')
        last_name = validated_data.pop('last_name', '')
        
        # Use our custom UserManager.create_user method
        user = User.objects.create_user(
            email=email,
            username=username,
            password=password,
            first_name=first_name,
            last_name=last_name
        )
        
        # Create associated profile
        UserProfile.objects.create(user=user)
        return user


class LoginSerializer(serializers.Serializer):
    """Serializer for user login (email or username)"""
    
    identifier = serializers.CharField()
    # Backward compatibility: allow old clients posting 'email'
    email = serializers.EmailField(required=False)
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        identifier = attrs.get('identifier') or attrs.get('email')
        password = attrs.get('password')
        
        if identifier and password:
            # Determine if identifier is email or username
            if '@' in identifier:
                user_obj = User.objects.filter(email__iexact=identifier).first()
            else:
                user_obj = User.objects.filter(username__iexact=identifier).first()
            
            user = None
            if user_obj:
                # Our AUTH uses email as USERNAME_FIELD, so authenticate with email
                user = authenticate(username=user_obj.email, password=password)
            
            if not user:
                raise serializers.ValidationError('Invalid credentials')
            # Enforce email verification prior to allowing login
            if not user.is_email_verified:
                raise serializers.ValidationError('Email no verificado. Revisa tu bandeja o reenvía el código.')
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled')
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError('Must include identifier and password')


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing password"""
    
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Old password is incorrect')
        return value


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for minimal user registration with password confirmation"""
    
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    email = serializers.EmailField(
        validators=[UniqueValidator(queryset=User.objects.all(), message='Email already registered')]
    )
    username = serializers.CharField(
        validators=[UniqueValidator(queryset=User.objects.all(), message='Username already taken')]
    )
    
    class Meta:
        model = User
        fields = [
            'email', 'username', 'password', 'password_confirm'
        ]
    
    def validate(self, attrs):
        """Validate that passwords match"""
        password = attrs.get('password')
        password_confirm = attrs.get('password_confirm')
        
        if password != password_confirm:
            raise serializers.ValidationError({
                'password_confirm': 'Passwords do not match'
            })
        
        # Remove password_confirm from validated data
        attrs.pop('password_confirm', None)
        return attrs
    
    def create(self, validated_data):
        """Create user with encrypted password"""
        password = validated_data.pop('password')
        
        # Create user using Django's built-in method
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=password
        )
        
        # Create associated profile  
        UserProfile.objects.create(user=user)
        return user


class VerifyEmailSerializer(serializers.Serializer):
    """Serializer to verify user's email using an OTP code"""
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)

    def validate(self, attrs):
        email = attrs.get('email')
        code = attrs.get('code')
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({'email': 'Usuario no encontrado'})

        if user.is_email_verified:
            raise serializers.ValidationError({'email': 'El email ya está verificado'})

        is_valid = services.verify_code_for_user(user, code)
        if not is_valid:
            raise serializers.ValidationError({'code': 'Código inválido o expirado'})

        attrs['user'] = user
        return attrs


class ResendVerificationSerializer(serializers.Serializer):
    """Serializer to resend verification code to user's email"""
    email = serializers.EmailField()

    def validate(self, attrs):
        email = attrs.get('email')
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({'email': 'Usuario no encontrado'})

        if user.is_email_verified:
            raise serializers.ValidationError({'email': 'El email ya está verificado'})

        allowed, seconds_remaining = services.can_resend_verification(user)
        if not allowed:
            raise serializers.ValidationError({'detail': f'Espera {seconds_remaining} segundos para reenviar'})

        attrs['user'] = user
        attrs['seconds_remaining'] = seconds_remaining
        return attrs


class GoogleLoginSerializer(serializers.Serializer):
    """Serializer to authenticate or register a user with a Google ID token."""
    id_token = serializers.CharField()

    def validate(self, attrs):
        token = attrs.get('id_token')
        if not token:
            raise serializers.ValidationError({'id_token': 'Token requerido'})

        # Verify Google ID token
        try:
            from google.oauth2 import id_token as google_id_token
            from google.auth.transport import requests as google_requests

            idinfo = google_id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                settings.GOOGLE_OAUTH_CLIENT_ID or None,
            )
            # Verify issuer
            if idinfo.get('iss') not in ['accounts.google.com', 'https://accounts.google.com']:
                raise ValueError('Invalid issuer')
        except Exception:
            raise serializers.ValidationError({'id_token': 'Token de Google inválido'})

        email = idinfo.get('email')
        email_verified = idinfo.get('email_verified', False)
        given_name = idinfo.get('given_name') or ''
        family_name = idinfo.get('family_name') or ''

        if not email:
            raise serializers.ValidationError({'email': 'Email no proporcionado por Google'})
        if not email_verified:
            raise serializers.ValidationError({'email': 'El email de Google no está verificado'})

        # Find or create user
        user = User.objects.filter(email__iexact=email).first()
        created = False
        if not user:
            # Generate a unique username based on email or given_name
            import re
            import random
            base = (given_name or email.split('@')[0] or 'user').lower()
            base = re.sub(r'[^a-z0-9_\.]+', '', base.replace(' ', '_'))
            if not base:
                base = 'user'
            candidate = base
            # Ensure uniqueness (case-insensitive)
            while User.objects.filter(username__iexact=candidate).exists():
                candidate = f"{base}{random.randint(1000, 99999)}"

            user = User.objects.create_user(
                email=email,
                username=candidate,
                password=User.objects.make_random_password(),
            )
            user.first_name = given_name
            user.last_name = family_name
            user.is_email_verified = True
            user.save()
            # Ensure profile exists
            UserProfile.objects.get_or_create(user=user)
            created = True
        else:
            # If existing user, mark email verified if not already
            if not user.is_email_verified:
                user.is_email_verified = True
                user.save(update_fields=['is_email_verified'])

        attrs['user'] = user
        attrs['created'] = created
        return attrs
