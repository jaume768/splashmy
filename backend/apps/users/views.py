from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import login, logout
from .models import User, UserProfile
from .serializers import (
    UserSerializer, UserRegistrationSerializer, LoginSerializer, 
    ChangePasswordSerializer, UserProfileSerializer,
    VerifyEmailSerializer, ResendVerificationSerializer,
)
from . import services


class RegisterView(generics.CreateAPIView):
    """User registration endpoint"""
    
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # Generate and send verification code via email
        try:
            services.generate_and_send_verification(user)
        except Exception as e:
            # Do not expose internal error; allow client to retry resend
            print(f"[RegisterView] Error sending verification: {e}")
        return Response({
            'message': 'Registro exitoso. Hemos enviado un código de verificación a tu correo.',
            'email': user.email,
            'verification_sent': True,
        }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    """User login endpoint"""
    
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        login(request, user)
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'user': UserSerializer(user).data,
            'token': token.key,
            'message': 'Login successful'
        }, status=status.HTTP_200_OK)
    
    return Response(
        serializer.errors, 
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(['POST'])
def logout_view(request):
    """User logout endpoint"""
    
    if request.user.is_authenticated:
        try:
            Token.objects.get(user=request.user).delete()
        except Token.DoesNotExist:
            pass
        logout(request)
        return Response({
            'message': 'Logout successful'
        }, status=status.HTTP_200_OK)
    
    return Response({
        'error': 'User not authenticated'
    }, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(generics.RetrieveUpdateAPIView):
    """User profile endpoint"""
    
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user


class UserProfileView(generics.RetrieveUpdateAPIView):
    """User profile details endpoint"""
    
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        profile, created = UserProfile.objects.get_or_create(
            user=self.request.user
        )
        return profile


@api_view(['POST'])
def change_password_view(request):
    """Change password endpoint"""
    
    serializer = ChangePasswordSerializer(
        data=request.data, 
        context={'request': request}
    )
    
    if serializer.is_valid():
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        # Update token
        try:
            Token.objects.get(user=user).delete()
        except Token.DoesNotExist:
            pass
        Token.objects.create(user=user)
        
        return Response({
            'message': 'Password changed successfully'
        }, status=status.HTTP_200_OK)
    
    return Response(
        serializer.errors, 
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def verify_email_view(request):
    """Verify email with OTP code and return auth token."""
    serializer = VerifyEmailSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'user': UserSerializer(user).data,
            'token': token.key,
            'message': 'Email verificado correctamente'
        }, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def resend_verification_view(request):
    """Resend verification code subject to cooldown."""
    serializer = ResendVerificationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        try:
            services.generate_and_send_verification(user)
        except Exception as e:
            print(f"[ResendVerification] Error: {e}")
        return Response({'message': 'Código reenviado'}, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
