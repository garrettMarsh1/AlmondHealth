from __future__ import annotations

import httpx

from .config import settings


def twilio_configured() -> bool:
    return bool(settings.twilio_sid and settings.twilio_token and settings.twilio_from)


def send_sms(to: str | None, body: str) -> dict:
    if not twilio_configured():
        return {"ok": True, "status": "recorded", "to": to, "body": body, "provider": "none"}
    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_sid}/Messages.json"
    try:
        r = httpx.post(
            url,
            auth=(settings.twilio_sid, settings.twilio_token),
            data={"To": to, "From": settings.twilio_from, "Body": body},
            timeout=settings.request_timeout,
        )
        r.raise_for_status()
        payload = r.json()
        return {"ok": True, "status": payload.get("status", "queued"), "to": to,
                "body": body, "provider": "twilio", "sid": payload.get("sid")}
    except httpx.HTTPError as exc:
        return {"ok": False, "status": "error", "to": to, "body": body,
                "provider": "twilio", "error": str(exc)}
