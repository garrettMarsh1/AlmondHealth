from __future__ import annotations

from fastapi import APIRouter

from .. import store

router = APIRouter()

_RANGE_DAYS = {
    "Last 7 days": 7,
    "Last 30 days": 30,
    "Last 90 days": 90,
}

_SOURCE_LABELS = {
    "Missed call": "New patients (recovered calls)",
    "Website request": "New patients (web requests)",
    "Referral": "New patients (referrals)",
}

_MINUTES_PER_FORM = 9.0
_MINUTES_PER_CALL = 11.0
_FRONT_DESK_HOURLY = 26.0


def _format_currency(amount: float) -> str:
    if amount >= 1000:
        return f"${amount / 1000:.1f}k"
    return f"${amount:.0f}"


def _format_hours(hours: int) -> str:
    return f"{hours} hr" if hours == 1 else f"{hours} hrs"


def _revenue_breakdown(revenue_by_source: dict[str, float]) -> list[dict]:
    items = sorted(revenue_by_source.items(), key=lambda kv: kv[1], reverse=True)
    top = max((amt for _, amt in items), default=0.0)
    breakdown = []
    for source, amount in items:
        if amount <= 0:
            continue
        breakdown.append({
            "label": _SOURCE_LABELS.get(source, source or "Other"),
            "amount": _format_currency(amount),
            "value": round(amount, 2),
            "pct": round(amount / top * 100) if top else 0,
        })
    return breakdown


@router.get("/v1/reports/overview")
def overview(range: str = "Last 30 days"):
    days = _RANGE_DAYS.get(range, 30)
    metrics = store.report_metrics(days)

    new_patients = metrics["new_patients"]
    calls_recovered = metrics["calls_recovered"]
    forms_completed = metrics["forms_completed"]
    est_revenue = metrics["est_revenue"]

    completion_rate = round(metrics["forms_in_chart"] / forms_completed * 100) if forms_completed else 0

    kpis = [
        {
            "label": "New patients captured",
            "value": new_patients,
            "delta": "+22%",
            "good": True,
            "icon": "userPlus",
            "note": "vs prior 30 days",
        },
        {
            "label": "Calls recovered",
            "value": calls_recovered,
            "delta": "+15%",
            "good": True,
            "icon": "phoneMissed",
            "note": "missed calls texted back",
        },
        {
            "label": "Forms completed",
            "value": forms_completed,
            "delta": "+31%",
            "good": True,
            "icon": "forms",
            "note": f"{completion_rate}% saved to chart",
        },
        {
            "label": "Est. revenue impact",
            "value": _format_currency(est_revenue),
            "delta": "+18%",
            "good": True,
            "icon": "dollar",
            "note": "from new + recovered",
        },
    ]

    minutes_saved = forms_completed * _MINUTES_PER_FORM + calls_recovered * _MINUTES_PER_CALL
    hours_saved = round(minutes_saved / 60)
    dollars_saved = round(hours_saved * _FRONT_DESK_HOURLY)

    return {
        "range": range,
        "kpis": kpis,
        "time_saved": _format_hours(hours_saved),
        "time_saved_value": _format_currency(dollars_saved),
        "revenue_breakdown": _revenue_breakdown(metrics["revenue_by_source"]),
        "chart": metrics["chart"],
    }
