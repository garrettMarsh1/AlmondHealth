from __future__ import annotations

from fastapi import APIRouter, Depends

from .. import store
from ..entitlements import require_feature

router = APIRouter()

_MINUTES_PER_FORM = 9.0
_MINUTES_PER_CALL = 11.0
_FRONT_DESK_HOURLY = 26.0
_AVG_NO_SHOW_COST = 250.0
_NO_SHOW_RATE = 0.18


@router.get("/v1/analytics/advanced")
def advanced(user=Depends(require_feature("advanced_analytics"))):
    leads = store.list_leads()
    total = len(leads)
    contacted = sum(1 for lead in leads if lead.stage in ("contacted", "booked", "converted"))
    converted = sum(1 for lead in leads if lead.stage == "converted")
    metrics = store.report_metrics(30)

    revenue_by_source = [
        {"source": source or "Other", "value": round(amount, 2)}
        for source, amount in sorted(metrics["revenue_by_source"].items(), key=lambda kv: kv[1], reverse=True)
    ]
    est_monthly_cost = round(converted * _NO_SHOW_RATE * _AVG_NO_SHOW_COST, 2)
    minutes = metrics["forms_completed"] * _MINUTES_PER_FORM + metrics["calls_recovered"] * _MINUTES_PER_CALL
    hours = round(minutes / 60)

    return {
        "funnel": {
            "leads": total,
            "contacted": contacted,
            "converted": converted,
            "conversion_rate": round(converted / total * 100, 1) if total else 0.0,
        },
        "revenue_by_source": revenue_by_source,
        "no_show": {"est_monthly_cost": est_monthly_cost, "recoverable": round(est_monthly_cost * 0.6, 2)},
        "time_saved": {"hours": hours, "value": round(hours * _FRONT_DESK_HOURLY, 2)},
    }
