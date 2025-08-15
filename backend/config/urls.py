"""
URL configuration for style transfer project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('apps.users.urls')),
    path('api/v1/images/', include('apps.images.urls')),
    path('api/v1/styles/', include('apps.styles.urls')),
    path('api/v1/processing/', include('apps.processing.urls')),
    path('api/v1/support/', include('apps.support.urls')),
]

# Media file serving
if settings.DEBUG:
    # Development: Serve media files directly (insecure but convenient)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
else:
    # Production: Serve media files through secure view
    from apps.images.views import serve_media_file, authenticated_media_proxy
    urlpatterns += [
        path('media/<path:file_path>', serve_media_file, name='secure_media'),
        path('api/v1/media/<path:file_path>', authenticated_media_proxy, name='authenticated_media'),
    ]
