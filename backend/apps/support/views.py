from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.throttling import ScopedRateThrottle

from .serializers import ContactSerializer
from .services import send_contact_email

try:  # Optional Celery import with graceful fallback
    from .tasks import send_contact_email_task
except Exception:  # pragma: no cover
    send_contact_email_task = None


class ContactView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'contact'

    def post(self, request):
        serializer = ContactSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        meta = {
            'ip': request.META.get('REMOTE_ADDR', ''),
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
        }
        payload = {
            'name': data['name'],
            'email': data['email'],
            'subject': data['subject'],
            'message': data['message'],
            'meta': meta,
        }

        # Strategy: use Celery in production, fallback to sync otherwise
        try:
            if getattr(settings, 'IS_PRODUCTION', False) and send_contact_email_task is not None:
                send_contact_email_task.delay(payload)
            else:
                send_contact_email(payload)
        except Exception:
            # Do not leak internal errors; log and return generic response
            # In real deployment you'd use proper logging here
            print('[Support] Error dispatching contact email')

        return Response({'message': 'Mensaje enviado. Te contactaremos pronto.'})
