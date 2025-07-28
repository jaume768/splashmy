from django.urls import path
from . import views

app_name = 'styles'

urlpatterns = [
    # Style categories
    path('categories/', views.StyleCategoryListView.as_view(), name='categories'),
    
    # Styles
    path('', views.StyleListView.as_view(), name='list'),
    path('<uuid:pk>/', views.StyleDetailView.as_view(), name='detail'),
    path('popular/', views.PopularStylesView.as_view(), name='popular'),
    
    # User preferences
    path('preferences/', views.UserStylePreferenceListView.as_view(), name='preferences'),
    path('<uuid:pk>/favorite/', views.toggle_favorite_style, name='toggle-favorite'),
    path('<uuid:pk>/rate/', views.rate_style, name='rate-style'),
    
    # Style examples
    path('<uuid:pk>/examples/', views.StyleExampleListView.as_view(), name='examples'),
]
