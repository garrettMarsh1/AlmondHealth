from __future__ import annotations

import math

import httpx

from . import store
from .config import settings


def twilio_configured() -> bool:
    return bool(settings.twilio_sid and settings.twilio_token and settings.twilio_from)


def _meter_campaign(body: str, account_id: str | None) -> None:
    resolved = account_id
    if resolved is None:
        default = store.get_default_account()
        resolved = default.id if default else None
    if resolved is None:
        return
    segments = max(1, math.ceil(len(body or "") / 160))
    store.record_usage(resolved, "sms_segments", segments)


def send_sms(to: str | None, body: str, category: str = "transactional",
             account_id: str | None = None) -> dict:
    if not twilio_configured():
        if category == "campaign":
            _meter_campaign(body, account_id)
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
        if category == "campaign":
            _meter_campaign(body, account_id)
        return {"ok": True, "status": payload.get("status", "queued"), "to": to,
                "body": body, "provider": "twilio", "sid": payload.get("sid")}
    except httpx.HTTPError as exc:
        return {"ok": False, "status": "error", "to": to, "body": body,
                "provider": "twilio", "error": str(exc)}
