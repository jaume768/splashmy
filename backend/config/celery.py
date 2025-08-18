"""
Celery configuration for Fotomorfia image processing
"""

import os
from celery import Celery
from django.conf import settings

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('fotomorfia')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Celery beat configuration for periodic tasks
app.conf.beat_schedule = {
    'cleanup-old-jobs': {
        'task': 'apps.processing.tasks.cleanup_old_jobs',
        'schedule': 60.0 * 60.0 * 12,  # Every 12 hours (reduced frequency)
    },
    'update-processing-stats': {
        'task': 'apps.processing.tasks.update_processing_stats',
        'schedule': 60.0 * 60.0 * 6,  # Every 6 hours (reduced frequency)
    },
    'cleanup-redis-data': {
        'task': 'apps.processing.tasks_cleanup.cleanup_redis_data',
        'schedule': 60.0 * 60.0 * 2,  # Every 2 hours
    },
    'optimize-processing-results': {
        'task': 'apps.processing.tasks_cleanup.optimize_processing_results',
        'schedule': 60.0 * 60.0 * 24,  # Daily
    },
    'cleanup-failed-jobs-data': {
        'task': 'apps.processing.tasks_cleanup.cleanup_failed_jobs_data',
        'schedule': 60.0 * 60.0 * 8,  # Every 8 hours
    },
}

app.conf.timezone = 'UTC'

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
