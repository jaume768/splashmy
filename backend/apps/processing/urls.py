from django.urls import path
from . import views

app_name = 'processing'

urlpatterns = [
    # Processing jobs
    path('jobs/', views.ProcessingJobCreateView.as_view(), name='create-job'),
    path('jobs/list/', views.ProcessingJobListView.as_view(), name='job-list'),
    path('jobs/<uuid:job_id>/', views.ProcessingJobDetailView.as_view(), name='job-detail'),
    path('jobs/<uuid:job_id>/cancel/', views.cancel_processing_job, name='cancel-job'),
    
    # Processing results
    path('results/', views.ProcessingResultListView.as_view(), name='results'),
    path('results/<uuid:result_id>/favorite/', views.toggle_result_favorite, name='toggle-favorite'),
    path('results/<uuid:result_id>/rate/', views.rate_result, name='rate-result'),
    path('results/<uuid:result_id>/download/', views.download_result, name='download-result'),
    
    # User quota and stats
    path('quota/', views.user_quota, name='user-quota'),
    path('stats/', views.processing_stats, name='processing-stats'),
    
    # Templates
    path('templates/', views.ProcessingTemplateListView.as_view(), name='templates'),
]
