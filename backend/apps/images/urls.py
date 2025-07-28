from django.urls import path
from . import views

app_name = 'images'

urlpatterns = [
    # Image management
    path('upload/', views.ImageUploadView.as_view(), name='upload'),
    path('', views.ImageListView.as_view(), name='list'),
    path('<uuid:pk>/', views.ImageDetailView.as_view(), name='detail'),
    path('public/', views.PublicImageListView.as_view(), name='public-list'),
    
    # Processed images
    path('processed/', views.ProcessedImageListView.as_view(), name='processed-list'),
    path('processed/<uuid:pk>/', views.ProcessedImageDetailView.as_view(), name='processed-detail'),
    path('processed/<uuid:pk>/favorite/', views.toggle_favorite, name='toggle-favorite'),
    path('processed/<uuid:pk>/rate/', views.rate_processed_image, name='rate-image'),
    
    # Downloads
    path('<uuid:pk>/download/', views.download_image, name='download'),
    
    # Tags
    path('tags/', views.ImageTagListView.as_view(), name='tags'),
    
    # User statistics
    path('stats/', views.user_stats, name='user-stats'),
    
    # Admin moderation endpoints
    path('moderation/', views.ImageModerationListView.as_view(), name='moderation-list'),
    path('moderation/<uuid:pk>/approve/', views.approve_image, name='approve-image'),
]
