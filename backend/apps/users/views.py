from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import login, logout
from .models import User, UserProfile
from .serializers import (
    UserSerializer, UserRegistrationSerializer, LoginSerializer, 
    ChangePasswordSerializer, UserProfileSerializer
)


class RegisterView(generics.CreateAPIView):
    """User registration endpoint"""
    
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Debug: print what we got
        print(f"DEBUG: user type: {type(user)}")
        print(f"DEBUG: user value: {user}")
        print(f"DEBUG: is User instance: {isinstance(user, User)}")
        
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'user': UserSerializer(user).data,
            'token': token.key,
            'message': 'User created successfully'
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
