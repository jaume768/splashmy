from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q, Avg, Count
from .models import StyleCategory, Style, StyleExample, UserStylePreference, StyleRating
from .serializers import (
    StyleCategorySerializer, StyleSerializer, StyleListSerializer,
    StyleExampleSerializer, UserStylePreferenceSerializer, StyleRatingSerializer
)
import logging

logger = logging.getLogger(__name__)


class StyleCategoryListView(generics.ListAPIView):
    """List all style categories"""
    
    serializer_class = StyleCategorySerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        return StyleCategory.objects.filter(is_active=True).order_by('sort_order', 'name')


class StyleListView(generics.ListAPIView):
    """List styles with filtering and search"""
    
    serializer_class = StyleListSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        queryset = Style.objects.filter(is_active=True).select_related('category')
        
        # Filter by category
        category_id = self.request.query_params.get('category')
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        
        # Filter by premium status
        is_premium = self.request.query_params.get('premium')
        if is_premium is not None:
            queryset = queryset.filter(is_premium=is_premium.lower() == 'true')
        
        # Search by name or description
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(description__icontains=search)
            )
        
        # Order by popularity or name
        order_by = self.request.query_params.get('order_by', 'popularity')
        if order_by == 'popularity':
            queryset = queryset.order_by('-popularity_score', 'name')
        elif order_by == 'name':
            queryset = queryset.order_by('name')
        elif order_by == 'newest':
            queryset = queryset.order_by('-created_at')
        else:
            queryset = queryset.order_by('category__sort_order', 'sort_order', 'name')
        
        return queryset


class StyleDetailView(generics.RetrieveAPIView):
    """Get detailed information about a specific style"""
    
    serializer_class = StyleSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        return Style.objects.filter(is_active=True).select_related('category').prefetch_related('examples')


class PopularStylesView(generics.ListAPIView):
    """List most popular styles"""
    
    serializer_class = StyleListSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        return Style.objects.filter(
            is_active=True
        ).select_related('category').order_by('-popularity_score')[:20]


class StyleExampleListView(generics.ListAPIView):
    """List examples for a specific style"""
    
    serializer_class = StyleExampleSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        style_id = self.kwargs.get('pk')
        return StyleExample.objects.filter(
            style_id=style_id
        ).order_by('sort_order', '-created_at')


class UserStylePreferenceListView(generics.ListCreateAPIView):
    """List and manage user's style preferences"""
    
    serializer_class = UserStylePreferenceSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = UserStylePreference.objects.filter(user=user).select_related('style', 'style__category')
        
        # Filter favorites only
        favorites_only = self.request.query_params.get('favorites')
        if favorites_only and favorites_only.lower() == 'true':
            queryset = queryset.filter(is_favorite=True)
        
        return queryset.order_by('-last_used', '-usage_count')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def toggle_favorite_style(request, pk):
    """Toggle favorite status of a style"""
    
    try:
        style = get_object_or_404(Style, pk=pk, is_active=True)
        user = request.user
        
        preference, created = UserStylePreference.objects.get_or_create(
            user=user,
            style=style,
            defaults={'is_favorite': True}
        )
        
        if not created:
            preference.is_favorite = not preference.is_favorite
            preference.save()
        
        return Response({
            'is_favorite': preference.is_favorite,
            'message': f"Style {'added to' if preference.is_favorite else 'removed from'} favorites"
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def rate_style(request, pk):
    """Rate a style (1-5 stars)"""
    
    try:
        rating_value = request.data.get('rating')
        comment = request.data.get('comment', '')
        
        if not rating_value or not isinstance(rating_value, int) or rating_value < 1 or rating_value > 5:
            return Response({
                'error': 'Rating must be an integer between 1 and 5'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        style = get_object_or_404(Style, pk=pk, is_active=True)
        user = request.user
        
        rating, created = StyleRating.objects.update_or_create(
            user=user,
            style=style,
            defaults={
                'rating': rating_value,
                'comment': comment
            }
        )
        
        # Update style popularity score based on new average rating
        avg_rating = style.ratings.aggregate(avg_rating=Avg('rating'))['avg_rating'] or 0
        rating_count = style.ratings.count()
        
        # Simple popularity score calculation (can be improved)
        style.popularity_score = int(avg_rating * rating_count * 10)
        style.save()
        
        return Response({
            'rating': rating_value,
            'comment': comment,
            'created': created,
            'message': 'Rating saved successfully',
            'style_average_rating': round(avg_rating, 1),
            'total_ratings': rating_count
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def style_stats(request):
    """Get general style statistics"""
    
    stats = {
        'total_styles': Style.objects.filter(is_active=True).count(),
        'total_categories': StyleCategory.objects.filter(is_active=True).count(),
        'premium_styles': Style.objects.filter(is_active=True, is_premium=True).count(),
        'free_styles': Style.objects.filter(is_active=True, is_premium=False).count(),
    }
    
    # Most popular styles
    popular_styles = Style.objects.filter(
        is_active=True
    ).order_by('-popularity_score')[:5]
    
    stats['most_popular'] = StyleListSerializer(
        popular_styles, 
        many=True,
        context={'request': request}
    ).data
    
    # Categories with style counts
    categories = StyleCategory.objects.filter(is_active=True).annotate(
        style_count=Count('styles', filter=Q(styles__is_active=True))
    ).order_by('-style_count')
    
    stats['categories'] = StyleCategorySerializer(categories, many=True).data
    
    return Response(stats)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_style_activity(request):
    """Get user's style activity and recommendations"""
    
    user = request.user
    
    # User's preferences
    preferences = UserStylePreference.objects.filter(user=user).select_related('style')
    favorite_styles = preferences.filter(is_favorite=True)
    most_used_styles = preferences.order_by('-usage_count')[:5]
    
    # Recommended styles based on user's category preferences
    if preferences.exists():
        favorite_categories = set(
            pref.style.category_id for pref in preferences 
            if pref.is_favorite or pref.usage_count > 0
        )
        
        recommended = Style.objects.filter(
            is_active=True,
            category_id__in=favorite_categories
        ).exclude(
            id__in=[pref.style_id for pref in preferences]
        ).order_by('-popularity_score')[:10]
    else:
        # For new users, recommend most popular styles
        recommended = Style.objects.filter(
            is_active=True
        ).order_by('-popularity_score')[:10]
    
    activity = {
        'favorite_styles': StyleListSerializer(
            [pref.style for pref in favorite_styles], 
            many=True,
            context={'request': request}
        ).data,
        'most_used_styles': UserStylePreferenceSerializer(
            most_used_styles, 
            many=True
        ).data,
        'recommended_styles': StyleListSerializer(
            recommended, 
            many=True,
            context={'request': request}
        ).data,
        'total_favorites': favorite_styles.count(),
        'total_tried': preferences.filter(usage_count__gt=0).count()
    }
    
    return Response(activity)
