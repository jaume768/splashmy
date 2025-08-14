from __future__ import annotations

from celery import shared_task
from .services import send_contact_email


@shared_task(name='apps.support.tasks.send_contact_email')
def send_contact_email_task(payload: dict) -> None:
    """Celery task wrapper to send contact email via Brevo."""
    send_contact_email(payload)
