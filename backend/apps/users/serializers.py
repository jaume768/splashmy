from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.contrib.auth import authenticate
from .models import User, UserProfile


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
