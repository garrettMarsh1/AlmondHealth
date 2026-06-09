from __future__ import annotations

from fastapi import Depends, HTTPException

from . import store

PLAN_ORDER = ["core", "pro", "practice_plus"]
PLAN_NAMES = {"core": "Core", "pro": "Pro", "practice_plus": "Practice+"}
PLAN_PRICES = {"core": 199, "pro": 349, "practice_plus": 599}

FEATURE_KEYS = [
    "waitlist_autofill",
    "review_automation",
    "advanced_analytics",
    "ai_voice",
    "payments_text_to_pay",
    "insurance_eligibility",
    "multi_location",
    "governance_audit",
]

PLAN_FEATURES = {
    "core": set(),
    "pro": {"waitlist_autofill", "review_automation", "advanced_analytics"},
    "practice_plus": {
        "waitlist_autofill", "review_automation", "advanced_analytics",
        "ai_voice", "payments_text_to_pay", "insurance_eligibility",
        "multi_location", "governance_audit",
    },
}

METER_LABELS = {
    "sms_segments": "Campaign SMS",
    "ai_minutes": "AI voice minutes",
    "eligibility_checks": "Eligibility checks",
}

QUOTAS = {
    "core": {
        "sms_segments": {"included": 1000, "overage_rate": 0.012},
        "ai_minutes": {"included": 0, "overage_rate": 0.15},
        "eligibility_checks": {"included": 0, "overage_rate": 0.20},
    },
    "pro": {
        "sms_segments": {"included": 5000, "overage_rate": 0.012},
        "ai_minutes": {"included": 0, "overage_rate": 0.15},
        "eligibility_checks": {"included": 0, "overage_rate": 0.20},
    },
    "practice_plus": {
        "sms_segments": {"included": 15000, "overage_rate": 0.012},
        "ai_minutes": {"included": 500, "overage_rate": 0.15},
        "eligibility_checks": {"included": 800, "overage_rate": 0.20},
    },
}


def required_plan_for(feature_key: str) -> str | None:
    for plan in PLAN_ORDER:
        if feature_key in PLAN_FEATURES.get(plan, set()):
            return plan
    return None


def quotas_for(account) -> dict:
    used = store.usage_for(account.id, store.current_period())
    out = {}
    for meter, cfg in QUOTAS.get(account.plan, {}).items():
        limit = cfg["included"] * account.location_count
        consumed = used.get(meter, 0)
        out[meter] = {
            "limit": limit,
            "used": consumed,
            "remaining": max(0, limit - consumed),
            "overage_rate": cfg["overage_rate"],
        }
    return out


def entitlements_for(account) -> dict:
    return {
        "plan": account.plan,
        "features": sorted(PLAN_FEATURES.get(account.plan, set())),
        "quotas": quotas_for(account),
    }


def require_feature(feature_key: str):
    from .auth import current_user

    def dependency(user=Depends(current_user)):
        account = store.account_for_user(user.id)
        need = required_plan_for(feature_key)
        if account is None or feature_key not in PLAN_FEATURES.get(account.plan, set()):
            raise HTTPException(402, detail={
                "error": "plan_required",
                "feature": feature_key,
                "plan": account.plan if account else None,
                "required_plan": need,
                "message": f"Upgrade to {PLAN_NAMES.get(need, need)} to use this feature",
            })
        return user

    return dependency


def require_quota(meter: str):
    from .auth import current_user

    def dependency(user=Depends(current_user)):
        account = store.account_for_user(user.id)
        if account is None:
            raise HTTPException(402, detail={
                "error": "quota_exceeded", "meter": meter, "used": 0, "limit": 0,
                "plan": None, "message": "no account on file",
            })
        cfg = QUOTAS.get(account.plan, {}).get(meter, {"included": 0, "overage_rate": 0.0})
        limit = cfg["included"] * account.location_count
        used = store.usage_for(account.id, store.current_period()).get(meter, 0)
        if used >= limit:
            raise HTTPException(402, detail={
                "error": "quota_exceeded",
                "meter": meter,
                "used": used,
                "limit": limit,
                "plan": account.plan,
                "message": f"{METER_LABELS.get(meter, meter)} limit reached on {PLAN_NAMES.get(account.plan, account.plan)}",
            })
        return user

    return dependency
