from __future__ import annotations

from fastapi import APIRouter, HTTPException

from .. import store
from ..config import settings
from ..connectors.registry import connector_for
from ..models import AppointmentCreate, LeadCreate, PatientCreate
from ..pdf import render_form_pdf

router = APIRouter()

_patient_name_cache: dict[str, str] = {}


def conn():
    return connector_for("demo")


def patient_name(patient_id: str | None) -> str | None:
    if not patient_id:
        return None
    if patient_id in _patient_name_cache:
        return _patient_name_cache[patient_id]
    try:
        patient = conn().get_patient(patient_id)
        name = f"{patient.first} {patient.last}".strip()
    except Exception:
        return None
    _patient_name_cache[patient_id] = name
    return name


@router.get("/v1/health")
def health():
    return {"ok": True, "pms": conn().name}


@router.get("/v1/providers")
def providers():
    return conn().list_providers()


@router.get("/v1/operatories")
def operatories():
    return conn().list_operatories()


@router.get("/v1/patients")
def patients(last: str | None = None, first: str | None = None):
    return conn().list_patients(last=last, first=first)


@router.get("/v1/appointments")
def appointments(date_start: str, date_end: str):
    rows = conn().list_appointments(date_start, date_end)
    out = []
    for appt in rows:
        item = appt.model_dump()
        item["patient_name"] = patient_name(appt.patient_id)
        out.append(item)
    return out


@router.get("/v1/availability")
def availability(date_start: str, date_end: str, minutes: int = 60):
    return conn().get_open_slots(date_start, date_end, minutes)


@router.post("/v1/appointments")
def book(data: AppointmentCreate):
    return conn().book_appointment(data)


@router.get("/v1/leads")
def leads():
    return store.list_leads()


@router.post("/v1/leads")
def create_lead(data: LeadCreate):
    return store.create_lead(data)


@router.post("/v1/leads/{lead_id}/convert")
def convert_lead(lead_id: str, operatory_id: str | None = None,
                 provider_id: str | None = None, start: str | None = None):
    lead = store.get_lead(lead_id)
    if not lead:
        raise HTTPException(404, "lead not found")
    first, _, last = lead.name.partition(" ")
    patient = conn().create_patient(PatientCreate(
        first=first or lead.name, last=last or "Lead", phone=lead.phone, email=lead.email))
    store.set_lead_converted(lead_id, patient.id)
    appt = None
    if operatory_id and start:
        appt = conn().book_appointment(AppointmentCreate(
            patient_id=patient.id, start=start, operatory_id=operatory_id,
            provider_id=provider_id, reason=lead.reason))
    return {"patient": patient, "appointment": appt, "lead": store.get_lead(lead_id)}


@router.get("/v1/forms/templates")
def templates():
    return store.list_templates()


@router.get("/v1/forms/submissions")
def submissions():
    return store.list_submissions()


@router.post("/v1/forms/send")
def send_form(template_id: str, patient_id: str | None = None, lead_id: str | None = None):
    sub = store.create_submission(template_id, patient_id=patient_id, lead_id=lead_id)
    return {"submission": sub, "link": f"/p/forms/{sub.link_token}"}


@router.post("/v1/forms/submit/{token}")
def submit_form(token: str, answers: dict):
    sub = store.get_submission_by_token(token)
    if not sub:
        raise HTTPException(404, "form link not found")
    sub.answers = answers
    sub.status = "completed"
    if sub.patient_id:
        lines = [f"{k}: {v}" for k, v in answers.items()]
        pdf = render_form_pdf("New Patient Intake - PracticeBridge", lines)
        doc = conn().upload_document(sub.patient_id, pdf, settings.form_doc_description)
        sub.document_id = doc.id
        sub.status = "in_chart"
    return store.update_submission(sub)
