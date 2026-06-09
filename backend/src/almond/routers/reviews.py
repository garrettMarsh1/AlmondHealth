from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from .. import notify, store
from ..auth import current_user
from ..config import settings
from ..entitlements import require_feature, require_quota

router = APIRouter()


class ReviewCreate(BaseModel):
    name: str
    phone: str | None = None
    patient_id: str | None = None


@router.get("/v1/reviews")
def list_requests(user=Depends(current_user)):
    account = store.account_for_user(user.id)
    return store.list_review_requests(account.id)


@router.post("/v1/reviews/request")
def request_review(data: ReviewCreate, user=Depends(require_feature("review_automation")),
                   _quota=Depends(require_quota("sms_segments"))):
    account = store.account_for_user(user.id)
    body = (f"Thanks for visiting {settings.practice_name}! We'd love your feedback: "
            f"{settings.review_link}")
    result = notify.send_sms(data.phone, body, category="campaign", account_id=account.id)
    status = result.get("status", "sent")
    return store.add_review_request(account.id, data.name, data.phone, data.patient_id, status)
