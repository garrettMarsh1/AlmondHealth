from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from .. import notify, store
from ..auth import current_user
from ..config import settings
from ..connectors.registry import connector_for
from ..entitlements import require_feature, require_quota

router = APIRouter()


class WaitlistCreate(BaseModel):
    name: str
    phone: str | None = None
    reason: str | None = None


class FillRequest(BaseModel):
    date_start: str
    date_end: str


@router.get("/v1/waitlist")
def list_entries(user=Depends(current_user)):
    account = store.account_for_user(user.id)
    return store.list_waitlist(account.id)


@router.post("/v1/waitlist")
def add_entry(data: WaitlistCreate, user=Depends(current_user)):
    account = store.account_for_user(user.id)
    return store.add_waitlist(account.id, data.name, data.phone, data.reason)


@router.delete("/v1/waitlist/{entry_id}")
def remove_entry(entry_id: str, user=Depends(current_user)):
    account = store.account_for_user(user.id)
    store.remove_waitlist(account.id, entry_id)
    return {"ok": True}


@router.post("/v1/waitlist/fill")
def fill(data: FillRequest, user=Depends(require_feature("waitlist_autofill")),
         _quota=Depends(require_quota("sms_segments"))):
    account = store.account_for_user(user.id)
    slots = connector_for("demo").get_open_slots(data.date_start, data.date_end, 60)
    slot = slots[0] if slots else None
    if slot is None:
        raise HTTPException(409, "no open slots in range")
    entries = [e for e in store.list_waitlist(account.id) if e.status == "active" and e.phone]
    last_status = None
    for entry in entries:
        body = (f"Good news from {settings.practice_name}! An opening just came up "
                f"at {slot.start}. Reply YES to claim it.")
        result = notify.send_sms(entry.phone, body, category="campaign", account_id=account.id)
        last_status = result.get("status")
    store.mark_waitlist_notified(account.id, [e.id for e in entries])
    return {"notified": len(entries), "slot": slot, "sms_status": last_status}
