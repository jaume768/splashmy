from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import login, logout
from django.conf import settings
from django.shortcuts import redirect
import secrets
from urllib.parse import urlencode
from .models import User, UserProfile
from .serializers import (
    UserSerializer, UserRegistrationSerializer, LoginSerializer, 
    ChangePasswordSerializer, UserProfileSerializer,
    VerifyEmailSerializer, ResendVerificationSerializer, GoogleLoginSerializer,
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


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def google_oauth_start(request):
    """Start Google OAuth Authorization Code flow by redirecting to Google."""
    next_path = request.GET.get('next', '/dashboard')
    # Generate anti-CSRF state and store in session
    state = secrets.token_urlsafe(16)
    request.session['google_oauth_state'] = state
    request.session['google_oauth_next'] = next_path

    params = {
        'client_id': settings.GOOGLE_OAUTH_CLIENT_ID,
        'redirect_uri': settings.GOOGLE_OAUTH_REDIRECT_URI,
        'response_type': 'code',
        'scope': 'openid email profile',
        'state': state,
        'access_type': 'online',
        'include_granted_scopes': 'true',
        'prompt': 'select_account',
    }

    auth_url = 'https://accounts.google.com/o/oauth2/v2/auth?' + urlencode(params)
    return redirect(auth_url)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def google_oauth_callback(request):
    """Handle Google OAuth callback, exchange code for tokens, and sign in user."""
    state = request.GET.get('state')
    code = request.GET.get('code')

    stored_state = request.session.get('google_oauth_state')
    next_path = request.session.get('google_oauth_next', '/dashboard')
    # Clear stored state/next regardless of outcome
    request.session.pop('google_oauth_state', None)
    request.session.pop('google_oauth_next', None)

    if not state or state != stored_state:
        return Response({'error': 'Invalid OAuth state'}, status=status.HTTP_400_BAD_REQUEST)

    if not code:
        error = request.GET.get('error', 'authorization_error')
        return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)

    # Exchange authorization code for tokens
    import requests
    token_endpoint = 'https://oauth2.googleapis.com/token'
    data = {
        'code': code,
        'client_id': settings.GOOGLE_OAUTH_CLIENT_ID,
        'client_secret': settings.GOOGLE_OAUTH_CLIENT_SECRET,
        'redirect_uri': settings.GOOGLE_OAUTH_REDIRECT_URI,
        'grant_type': 'authorization_code',
    }
    try:
        token_resp = requests.post(token_endpoint, data=data, timeout=10)
        token_json = token_resp.json()
        id_token = token_json.get('id_token')
        if not token_resp.ok or not id_token:
            return Response({'error': 'Failed to exchange code', 'details': token_json}, status=status.HTTP_400_BAD_REQUEST)

        # Reuse existing serializer to validate id_token and get/create user
        serializer = GoogleLoginSerializer(data={'id_token': id_token})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)

        # Redirect to frontend to finalize login and redirect user
        frontend_url = settings.FRONTEND_OAUTH_REDIRECT_URL
        params = {'token': token.key, 'next': next_path}
        redirect_url = f"{frontend_url}?{urlencode(params)}"
        return redirect(redirect_url)
    except Exception as e:
        return Response({'error': 'OAuth callback error', 'details': str(e)}, status=status.HTTP_400_BAD_REQUEST)


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


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def google_login_view(request):
    """Authenticate or register a user using a Google ID token and return DRF token."""
    serializer = GoogleLoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'user': UserSerializer(user).data,
            'token': token.key,
            'is_new_user': serializer.validated_data.get('created', False),
            'message': 'Login con Google exitoso'
        }, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
