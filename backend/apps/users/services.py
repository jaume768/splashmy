"""
Email verification services for users: OTP generation, hashing, storage, and Brevo email sending.
"""
from __future__ import annotations

import hashlib
import random
import string
from datetime import timedelta
from typing import Tuple, Optional

from django.conf import settings
from django.utils import timezone

from .models import EmailVerification, PasswordReset, User

try:
    import sib_api_v3_sdk
    from sib_api_v3_sdk.rest import ApiException
except Exception:  # pragma: no cover
    sib_api_v3_sdk = None
    ApiException = Exception


def _hash_code(code: str) -> str:
    """Create a stable hash for a code using SECRET_KEY as salt."""
    salt = settings.SECRET_KEY
    return hashlib.sha256(f"{code}{salt}".encode("utf-8")).hexdigest()


def generate_numeric_code(length: int = 6) -> str:
    """Generate a numeric OTP code of given length (default 6)."""
    return "".join(random.choices(string.digits, k=length))


def can_resend_verification(user: User) -> Tuple[bool, int]:
    """
    Check if we can resend a verification code based on cooldown.
    Returns (allowed, seconds_remaining_if_blocked)
    """
    cooldown = int(getattr(settings, "EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS", 60))
    latest: Optional[EmailVerification] = (
        EmailVerification.objects.filter(user=user).order_by("-created_at").first()
    )
    if not latest or not latest.last_sent_at:
        return True, 0
    elapsed = (timezone.now() - latest.last_sent_at).total_seconds()
    if elapsed >= cooldown:
        return True, 0
    return False, int(cooldown - elapsed)


def create_verification_record(user: User, code: str) -> EmailVerification:
    """Create a new verification record for the user, removing stale ones."""
    # Optionally prune old records for this user
    EmailVerification.objects.filter(user=user).delete()

    ttl = int(getattr(settings, "EMAIL_VERIFICATION_CODE_TTL_MINUTES", 10))
    expires_at = timezone.now() + timedelta(minutes=ttl)
    record = EmailVerification.objects.create(
        user=user,
        code_hash=_hash_code(code),
        expires_at=expires_at,
        attempts=0,
        last_sent_at=timezone.now(),
        resend_count=0,
    )
    return record


def verify_code_for_user(user: User, code: str) -> bool:
    """
    Verify provided code for the user. Returns True if verified and marks user.
    Applies attempts and expiry checks.
    """
    max_attempts = int(getattr(settings, "EMAIL_VERIFICATION_MAX_ATTEMPTS", 5))
    now = timezone.now()
    record = (
        EmailVerification.objects.filter(user=user, expires_at__gte=now)
        .order_by("-created_at")
        .first()
    )
    if not record:
        return False

    # Check attempts limit first
    if record.attempts >= max_attempts:
        return False

    # Compare hashes
    if record.code_hash != _hash_code(code):
        record.attempts += 1
        record.save(update_fields=["attempts"])
        return False

    # Success: mark user verified and clean records
    user.is_email_verified = True
    user.save(update_fields=["is_email_verified"])
    EmailVerification.objects.filter(user=user).delete()
    return True


def send_verification_email(user: User, code: str) -> None:
    """
    Send the verification email via Brevo transactional email API.
    If BREVO_API_KEY is missing or SDK unavailable, logs and returns silently.
    """
    api_key = getattr(settings, "BREVO_API_KEY", "")
    if not api_key or sib_api_v3_sdk is None:
        print("[EmailVerification] Brevo SDK or API key not configured. Code:", code)
        return

    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key["api-key"] = api_key
    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))

    sender = {
        "email": getattr(settings, "EMAIL_FROM_ADDRESS", "no-reply@example.com"),
        "name": getattr(settings, "EMAIL_FROM_NAME", "SplashMy"),
    }
    to = [{"email": user.email, "name": user.get_full_name() or user.username or user.email}]

    template_id = getattr(settings, "EMAIL_VERIFICATION_TEMPLATE_ID", None)
    try:
        if template_id:
            smtp_email = sib_api_v3_sdk.SendSmtpEmail(
                to=to,
                template_id=int(template_id),
                params={
                    "CODE": code,
                    "EMAIL": user.email,
                    "USERNAME": user.username,
                },
                sender=sender,
            )
        else:
            subject = "Verifica tu correo - SplashMy"
            html_content = (
                f"<p>Hola {user.username or ''},</p>"
                f"<p>Tu código de verificación es: <strong>{code}</strong></p>"
                f"<p>Caduca en {getattr(settings, 'EMAIL_VERIFICATION_CODE_TTL_MINUTES', 10)} minutos.</p>"
            )
            smtp_email = sib_api_v3_sdk.SendSmtpEmail(
                to=to,
                sender=sender,
                subject=subject,
                html_content=html_content,
            )

        api_instance.send_transac_email(smtp_email)
    except ApiException as e:  # pragma: no cover
        print(f"[EmailVerification] Brevo send error: {e}")


def generate_and_send_verification(user: User) -> str:
    """
    Generate a new code, create a record, and send the email. Returns the code.
    """
    code = generate_numeric_code(6)
    create_verification_record(user, code)
    send_verification_email(user, code)
    return code


# ============================================================================
# Password Reset Services (OTP via email)
# ============================================================================

def can_resend_password_reset(user: User) -> Tuple[bool, int]:
    """
    Check if we can resend a password reset code based on cooldown.
    Returns (allowed, seconds_remaining_if_blocked)
    """
    cooldown = int(getattr(settings, "PASSWORD_RESET_RESEND_COOLDOWN_SECONDS", 60))
    latest: Optional[PasswordReset] = (
        PasswordReset.objects.filter(user=user).order_by("-created_at").first()
    )
    if not latest or not latest.last_sent_at:
        return True, 0
    elapsed = (timezone.now() - latest.last_sent_at).total_seconds()
    if elapsed >= cooldown:
        return True, 0
    return False, int(cooldown - elapsed)


def create_password_reset_record(user: User, code: str) -> PasswordReset:
    """Create a new password reset record for the user, removing stale ones."""
    PasswordReset.objects.filter(user=user).delete()

    ttl = int(getattr(settings, "PASSWORD_RESET_CODE_TTL_MINUTES", 15))
    expires_at = timezone.now() + timedelta(minutes=ttl)
    record = PasswordReset.objects.create(
        user=user,
        code_hash=_hash_code(code),
        expires_at=expires_at,
        attempts=0,
        last_sent_at=timezone.now(),
        resend_count=0,
    )
    return record


def verify_password_reset_code(user: User, code: str) -> bool:
    """
    Verify provided password reset code for the user.
    Returns True if valid; does NOT change password here.
    Applies attempts and expiry checks.
    """
    max_attempts = int(getattr(settings, "PASSWORD_RESET_MAX_ATTEMPTS", 5))
    now = timezone.now()
    record = (
        PasswordReset.objects.filter(user=user, expires_at__gte=now)
        .order_by("-created_at")
        .first()
    )
    if not record:
        return False

    if record.attempts >= max_attempts:
        return False

    if record.code_hash != _hash_code(code):
        record.attempts += 1
        record.save(update_fields=["attempts"])
        return False

    # Success: do not change password here, just clear reset records
    PasswordReset.objects.filter(user=user).delete()
    return True


def send_password_reset_email(user: User, code: str) -> None:
    """
    Send the password reset email via Brevo transactional email API.
    If BREVO_API_KEY is missing or SDK unavailable, logs and returns silently.
    """
    api_key = getattr(settings, "BREVO_API_KEY", "")
    if not api_key or sib_api_v3_sdk is None:
        print("[PasswordReset] Brevo SDK or API key not configured. Code:", code)
        return

    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key["api-key"] = api_key
    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))

    sender = {
        "email": getattr(settings, "EMAIL_FROM_ADDRESS", "no-reply@example.com"),
        "name": getattr(settings, "EMAIL_FROM_NAME", "SplashMy"),
    }
    to = [{"email": user.email, "name": user.get_full_name() or user.username or user.email}]

    template_id = getattr(settings, "PASSWORD_RESET_TEMPLATE_ID", None)
    try:
        if template_id:
            smtp_email = sib_api_v3_sdk.SendSmtpEmail(
                to=to,
                template_id=int(template_id),
                params={
                    "CODE": code,
                    "EMAIL": user.email,
                    "USERNAME": user.username,
                },
                sender=sender,
            )
        else:
            subject = "Restablece tu contraseña - SplashMy"
            html_content = (
                f"<p>Hola {user.username or ''},</p>"
                f"<p>Tu código para restablecer la contraseña es: <strong>{code}</strong></p>"
                f"<p>Caduca en {getattr(settings, 'PASSWORD_RESET_CODE_TTL_MINUTES', 15)} minutos.</p>"
            )
            smtp_email = sib_api_v3_sdk.SendSmtpEmail(
                to=to,
                sender=sender,
                subject=subject,
                html_content=html_content,
            )

        api_instance.send_transac_email(smtp_email)
    except ApiException as e:  # pragma: no cover
        print(f"[PasswordReset] Brevo send error: {e}")


def generate_and_send_password_reset(user: User) -> str:
    """
    Generate a new code, create a password reset record, and send the email. Returns the code.
    """
    code = generate_numeric_code(6)
    create_password_reset_record(user, code)
    send_password_reset_email(user, code)
    return code
