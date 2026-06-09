from __future__ import annotations

import hashlib
import hmac
import json

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from .. import store
from ..auth import current_user, require_role
from ..config import settings
from ..entitlements import (
    PLAN_FEATURES,
    PLAN_NAMES,
    PLAN_ORDER,
    PLAN_PRICES,
    QUOTAS,
    entitlements_for,
)

router = APIRouter()


class PlanRequest(BaseModel):
    plan: str


def stripe_configured() -> bool:
    return bool(settings.stripe_secret_key)


def _price_id(plan: str) -> str | None:
    return {
        "core": settings.stripe_price_core,
        "pro": settings.stripe_price_pro,
        "practice_plus": settings.stripe_price_practice_plus,
    }.get(plan)


def _plan_for_price(price_id: str) -> str | None:
    for plan in PLAN_ORDER:
        if _price_id(plan) and _price_id(plan) == price_id:
            return plan
    return None


def _blurb(plan: str) -> str:
    return {
        "core": "The full front-office core loop — capture, book, intake-to-chart, and messaging. Never fenced.",
        "pro": "Adds the growth engine: waitlist auto-fill, review automation, and advanced analytics.",
        "practice_plus": "Multi-location, governance, and the AI suite (voice, payments, eligibility). Quote-gated from $599/location.",
    }.get(plan, "")


@router.get("/v1/billing/plan")
def billing_plan(user=Depends(current_user)):
    account = store.account_for_user(user.id)
    if account is None:
        raise HTTPException(404, "no account")
    ent = entitlements_for(account)
    return {
        "plan": account.plan,
        "price_monthly": PLAN_PRICES.get(account.plan),
        "location_count": account.location_count,
        "features": ent["features"],
        "quotas": ent["quotas"],
        "stripe_configured": stripe_configured(),
    }


@router.get("/v1/billing/plans")
def billing_plans(user=Depends(current_user)):
    out = []
    for plan in PLAN_ORDER:
        out.append({
            "plan": plan,
            "name": PLAN_NAMES[plan],
            "price_monthly": PLAN_PRICES[plan],
            "blurb": _blurb(plan),
            "features": sorted(PLAN_FEATURES.get(plan, set())),
            "quotas": {
                meter: {"included": cfg["included"], "overage_rate": cfg["overage_rate"]}
                for meter, cfg in QUOTAS.get(plan, {}).items()
            },
            "recommended": plan == "pro",
        })
    return out


@router.post("/v1/billing/checkout")
def checkout(data: PlanRequest, user=Depends(current_user)):
    account = store.account_for_user(user.id)
    if account is None:
        raise HTTPException(404, "no account")
    if not stripe_configured():
        return {"status": "recorded", "plan": data.plan,
                "note": "Stripe not configured - use the dev set-plan switch"}
    price_id = _price_id(data.plan)
    if not price_id:
        raise HTTPException(400, "no Stripe price configured for plan")
    try:
        r = httpx.post(
            "https://api.stripe.com/v1/checkout/sessions",
            headers={"Authorization": f"Bearer {settings.stripe_secret_key}"},
            data={
                "mode": "subscription",
                "line_items[0][price]": price_id,
                "line_items[0][quantity]": account.location_count,
                "success_url": "http://localhost:5175/#billing",
                "cancel_url": "http://localhost:5175/#billing",
                "client_reference_id": account.id,
            },
            timeout=settings.request_timeout,
        )
        r.raise_for_status()
        return {"url": r.json().get("url")}
    except httpx.HTTPError as exc:
        raise HTTPException(502, f"stripe checkout failed: {exc}")


@router.post("/v1/billing/dev/set-plan")
def dev_set_plan(data: PlanRequest, user=Depends(require_role("owner", "admin"))):
    if stripe_configured():
        raise HTTPException(403, "disabled when Stripe is configured")
    if data.plan not in PLAN_ORDER:
        raise HTTPException(400, "unknown plan")
    account = store.account_for_user(user.id)
    if account is None:
        raise HTTPException(404, "no account")
    previous = account.plan
    updated = store.set_plan(account.id, data.plan)
    store.append_audit(user.name, "Changed plan", f"{previous} -> {data.plan}", sync="-")
    return {"ok": True, "plan": updated.plan, "entitlements": entitlements_for(updated)}


def _verify_signature(raw: bytes, header: str, secret: str) -> bool:
    parts = dict(p.split("=", 1) for p in header.split(",") if "=" in p)
    t = parts.get("t")
    v1 = parts.get("v1")
    if not t or not v1:
        return False
    signed = f"{t}.".encode("utf-8") + raw
    expected = hmac.new(secret.encode("utf-8"), signed, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, v1)


def _handle_event(event: dict) -> None:
    etype = event.get("type", "")
    if not etype.startswith("customer.subscription"):
        return
    obj = event.get("data", {}).get("object", {})
    customer = obj.get("customer")
    account = store.find_account_by_stripe_customer(customer) if customer else None
    if account is None:
        account = store.get_default_account()
    if account is None:
        return
    if etype == "customer.subscription.deleted":
        store.set_plan(account.id, "core")
        return
    items = obj.get("items", {}).get("data", [])
    price_id = items[0].get("price", {}).get("id") if items else None
    plan = _plan_for_price(price_id) if price_id else None
    if plan:
        store.set_plan(account.id, plan)


@router.post("/v1/billing/webhook")
async def webhook(request: Request):
    raw = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    if settings.stripe_webhook_secret and not _verify_signature(raw, sig, settings.stripe_webhook_secret):
        raise HTTPException(400, "bad signature")
    try:
        event = json.loads(raw.decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        raise HTTPException(400, "invalid payload")
    event_id = event.get("id", "")
    if event_id and store.processed_stripe_event(event_id):
        return {"received": True, "duplicate": True}
    _handle_event(event)
    return {"received": True}
