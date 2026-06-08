from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from .. import notify, store
from ..auth import optional_user
from ..models import MessageCreate, User

router = APIRouter()


@router.get("/v1/conversations")
def conversations():
    return store.list_conversations()


@router.get("/v1/conversations/{conversation_id}")
def conversation(conversation_id: str):
    convo = store.get_conversation(conversation_id)
    if not convo:
        raise HTTPException(404, "conversation not found")
    return convo


@router.post("/v1/conversations/{conversation_id}/messages")
def post_message(conversation_id: str, data: MessageCreate,
                 user: User | None = Depends(optional_user)):
    convo = store.get_conversation(conversation_id)
    if not convo:
        raise HTTPException(404, "conversation not found")
    delivery = notify.send_sms(convo.phone, data.text)
    sender = user.name if user else "Front Desk"
    message = store.add_message(
        conversation_id, "out", data.text, author=sender,
        channel=convo.channel, status=delivery["status"],
    )
    return {
        "message": message,
        "delivery": {
            "ok": delivery["ok"],
            "status": delivery["status"],
            "provider": delivery["provider"],
        },
    }
