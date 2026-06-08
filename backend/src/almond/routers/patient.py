from __future__ import annotations

from datetime import date, datetime, timezone

from fastapi import APIRouter, HTTPException

from .. import store
from ..connectors.registry import connector_for

router = APIRouter()

_APPT_LOOKBACK_YEARS = 3
_APPT_LOOKAHEAD_YEARS = 2


def conn():
    return connector_for("demo")


def _appt_window() -> tuple[str, str]:
    today = date.today()
    start = today.replace(year=today.year - _APPT_LOOKBACK_YEARS)
    end = today.replace(year=today.year + _APPT_LOOKAHEAD_YEARS)
    return start.isoformat(), end.isoformat()


def _event_key(when: str | None) -> str:
    return when or ""


def _appt_events(patient_id: str) -> list[dict]:
    start, end = _appt_window()
    try:
        appointments = conn().list_appointments(start, end)
    except Exception:
        return []
    events = []
    for appt in appointments:
        if appt.patient_id != patient_id:
            continue
        when = appt.start.isoformat() if isinstance(appt.start, datetime) else str(appt.start)
        title = appt.reason or "Appointment"
        detail_parts = [p for p in (appt.status, f"Op {appt.operatory_id}" if appt.operatory_id else None) if p]
        events.append({
            "type": "appt",
            "icon": "calendar",
            "title": title,
            "detail": " · ".join(detail_parts),
            "when": when,
            "sync": "saved",
            "_sort": when,
        })
    return events


def _form_events(patient_id: str) -> list[dict]:
    templates = {t.id: t for t in store.list_templates()}
    events = []
    for sub in store.list_submissions_for_patient(patient_id):
        template = templates.get(sub.template_id)
        name = template.name if template else "Form"
        if sub.status == "in_chart":
            title = f"{name} completed"
            detail = "PDF generated · saved to chart"
        elif sub.status == "completed":
            title = f"{name} completed"
            detail = "Completed · awaiting chart sync"
        else:
            title = f"{name} sent"
            detail = "Sent · awaiting completion"
        events.append({
            "type": "form",
            "icon": "forms",
            "title": title,
            "detail": detail,
            "when": None,
            "sync": "saved" if sub.status == "in_chart" else None,
            "_sort": "",
        })
    return events


def _msg_events(patient_id: str) -> list[dict]:
    events = []
    for msg in store.messages_for_patient(patient_id):
        when = msg.created_at.isoformat() if isinstance(msg.created_at, datetime) else (msg.created_at or "")
        outgoing = msg.direction == "out"
        icon = "send" if outgoing else "message"
        verb = "Sent" if outgoing else "Received"
        events.append({
            "type": "msg",
            "icon": icon,
            "title": f'{verb} "{msg.body}"',
            "detail": f"{msg.channel.upper()} · {msg.status}" if msg.status else msg.channel.upper(),
            "when": when or None,
            "sync": None,
            "_sort": when,
        })
    return events


@router.get("/v1/patients/{patient_id}/timeline")
def timeline(patient_id: str):
    try:
        patient = conn().get_patient(patient_id)
    except Exception:
        raise HTTPException(404, "patient not found")
    if patient is None:
        raise HTTPException(404, "patient not found")

    events = _appt_events(patient_id) + _form_events(patient_id) + _msg_events(patient_id)
    events.sort(key=lambda e: e["_sort"], reverse=True)
    for e in events:
        e.pop("_sort", None)

    return {"patient": patient, "events": events}
