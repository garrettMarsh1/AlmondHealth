from __future__ import annotations

from fastapi import APIRouter

from .. import notify, store
from ..config import settings
from .core import conn

router = APIRouter()


@router.get("/v1/settings/connectors")
def connectors():
    twilio_connected = notify.twilio_configured()
    twilio_status = "connected" if twilio_connected else "available"
    twilio_detail = (
        f"BAA signed - {settings.twilio_from}"
        if twilio_connected
        else "Twilio not configured"
    )
    return [
        {"name": conn().name, "kind": "PMS", "status": "connected",
         "detail": "Live API", "writes": True},
        {"name": "Twilio SMS", "kind": "Messaging", "status": twilio_status,
         "detail": twilio_detail, "writes": True},
        {"name": "Denticon", "kind": "PMS", "status": "available",
         "detail": "Planet DDS - cloud API", "writes": False},
        {"name": "NextGen", "kind": "EHR", "status": "available",
         "detail": "Cloud API", "writes": False},
    ]


@router.get("/v1/settings/users")
def users():
    return store.list_users()


@router.get("/v1/settings/audit")
def audit():
    return store.list_audit()
