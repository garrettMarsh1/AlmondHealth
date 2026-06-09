from __future__ import annotations

from fastapi import FastAPI

from . import auth, db, store
from .routers import (
    analytics,
    billing,
    core,
    forms,
    messages,
    patient,
    patient_public,
    reports,
    reviews,
    settings,
    usage,
    waitlist,
)

app = FastAPI(title="Almond API", version="0.1.0")

db.init()
store.seed()
auth.ensure_seed_token()

app.include_router(core.router)
app.include_router(reports.router)
app.include_router(forms.router)
app.include_router(patient.router)
app.include_router(messages.router)
app.include_router(settings.router)
app.include_router(patient_public.router)
app.include_router(auth.router)
app.include_router(billing.router)
app.include_router(usage.router)
app.include_router(analytics.router)
app.include_router(waitlist.router)
app.include_router(reviews.router)
