from __future__ import annotations

from django.conf import settings

try:
    import sib_api_v3_sdk
    from sib_api_v3_sdk.rest import ApiException
except Exception:  # pragma: no cover
    sib_api_v3_sdk = None
    ApiException = Exception


def _build_html_content(name: str, email: str, subject_text: str, message: str, meta: dict | None = None) -> str:
    meta = meta or {}
    ip = meta.get('ip') or ''
    ua = meta.get('user_agent') or ''
    safe_message = (message or '').replace('\n', '<br/>')
    return (
        f"<h3>Nuevo mensaje de contacto</h3>"
        f"<p><strong>Nombre:</strong> {name}</p>"
        f"<p><strong>Email:</strong> {email}</p>"
        f"<p><strong>Asunto:</strong> {subject_text}</p>"
        f"<p><strong>Mensaje:</strong><br/>{safe_message}</p>"
        f"<hr/><p style='font-size:12px;color:#666'>IP: {ip} | User-Agent: {ua}</p>"
    )


def send_contact_email(payload: dict) -> None:
    """Send contact email to support inbox via Brevo. Fallback to logging if not configured."""
    api_key = getattr(settings, "BREVO_API_KEY", "")
    if not api_key or sib_api_v3_sdk is None:
        print("[Support] Brevo SDK or API key not configured. Payload:", payload)
        return

    name = payload.get('name', '')
    email = payload.get('email', '')
    subject_key = payload.get('subject', 'soporte')
    message = payload.get('message', '')
    meta = payload.get('meta') or {}

    subject_map = {
        'soporte': 'Soporte técnico',
        'facturacion': 'Facturación',
        'sugerencias': 'Sugerencias',
        'otros': 'Otros',
    }
    subject_text = subject_map.get(subject_key, subject_key)

    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key['api-key'] = api_key
    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))

    sender = {
        "email": getattr(settings, "EMAIL_FROM_ADDRESS", "no-reply@example.com"),
        "name": getattr(settings, "EMAIL_FROM_NAME", "SplashMy"),
    }
    inbox_email = getattr(settings, "SUPPORT_INBOX_EMAIL", sender["email"])
    to = [{"email": inbox_email, "name": "Soporte SplashMy"}]

    template_id = getattr(settings, "CONTACT_SUPPORT_TEMPLATE_ID", None)

    try:
        if template_id:
            smtp_email = sib_api_v3_sdk.SendSmtpEmail(
                to=to,
                template_id=int(template_id),
                params={
                    "NAME": name,
                    "EMAIL": email,
                    "SUBJECT": subject_text,
                    "MESSAGE": message,
                    "IP": meta.get('ip') or '',
                    "USER_AGENT": meta.get('user_agent') or '',
                },
                sender=sender,
                reply_to={"email": email, "name": name},
                tags=["support", "contact"],
            )
        else:
            html_content = _build_html_content(name, email, subject_text, message, meta)
            smtp_email = sib_api_v3_sdk.SendSmtpEmail(
                to=to,
                sender=sender,
                subject=f"[Contacto] {subject_text}",
                html_content=html_content,
                reply_to={"email": email, "name": name},
                tags=["support", "contact"],
            )

        api_instance.send_transac_email(smtp_email)
    except ApiException as e:  # pragma: no cover
        print(f"[Support] Brevo send error: {e}")
