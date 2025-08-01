"""
Celery configuration for SplashMy image processing
"""

import os
from celery import Celery
from django.conf import settings

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('splashmy')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Celery beat configuration for periodic tasks
app.conf.beat_schedule = {
    'cleanup-old-jobs': {
        'task': 'apps.processing.tasks.cleanup_old_jobs',
        'schedule': 60.0 * 60.0,  # Every hour
    },
    'update-processing-stats': {
        'task': 'apps.processing.tasks.update_processing_stats',
        'schedule': 60.0 * 30.0,  # Every 30 minutes
    },
}

app.conf.timezone = 'UTC'

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
