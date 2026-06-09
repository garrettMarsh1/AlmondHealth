from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from .. import store
from ..auth import current_user
from ..entitlements import METER_LABELS, QUOTAS

router = APIRouter()


@router.get("/v1/usage")
def usage(user=Depends(current_user)):
    account = store.account_for_user(user.id)
    if account is None:
        raise HTTPException(404, "no account")
    used = store.usage_for(account.id, store.current_period())
    meters = []
    for meter, cfg in QUOTAS.get(account.plan, {}).items():
        included = cfg["included"] * account.location_count
        consumed = used.get(meter, 0)
        meters.append({
            "key": meter,
            "label": METER_LABELS.get(meter, meter),
            "used": consumed,
            "included": included,
            "remaining": max(0, included - consumed),
            "overage_rate": cfg["overage_rate"],
        })
    return {"period": store.current_period(), "plan": account.plan, "meters": meters}
