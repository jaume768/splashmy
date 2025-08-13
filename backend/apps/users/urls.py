from django.urls import path
from . import views

app_name = 'users'

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('profile/details/', views.UserProfileView.as_view(), name='profile-details'),
    path('change-password/', views.change_password_view, name='change-password'),
    path('verify-email/', views.verify_email_view, name='verify-email'),
    path('resend-verification/', views.resend_verification_view, name='resend-verification'),
    # Google OAuth Authorization Code flow
    path('google/start/', views.google_oauth_start, name='google-oauth-start'),
    path('google/callback/', views.google_oauth_callback, name='google-oauth-callback'),
    path('google-login/', views.google_login_view, name='google-login'),
]
