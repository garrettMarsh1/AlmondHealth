from __future__ import annotations

from fastapi import APIRouter, HTTPException

from .. import store
from ..config import settings
from ..connectors.registry import connector_for
from ..pdf import render_form_pdf

router = APIRouter()


def conn():
    return connector_for("demo")


@router.get("/v1/p/forms/{token}")
def public_form(token: str):
    submission = store.get_submission_by_token(token)
    if not submission:
        raise HTTPException(404, "form link not found")
    template = store.get_template(submission.template_id)
    form_name = template.name if template else "Form"
    form_fields = template.fields if template else []
    return {
        "practice": {
            "name": settings.practice_name,
            "location": settings.practice_location,
            "phone": settings.practice_phone,
        },
        "form": {"name": form_name, "fields": form_fields},
        "status": submission.status,
    }


@router.post("/v1/p/forms/{token}")
def submit_public_form(token: str, answers: dict):
    submission = store.get_submission_by_token(token)
    if not submission:
        raise HTTPException(404, "form link not found")
    submission.answers = answers
    submission.status = "completed"
    if submission.patient_id:
        template = store.get_template(submission.template_id)
        title = f"{template.name} - PracticeBridge" if template else "Form - PracticeBridge"
        lines = [f"{label}: {value}" for label, value in answers.items()]
        pdf = render_form_pdf(title, lines)
        document = conn().upload_document(submission.patient_id, pdf, settings.form_doc_description)
        submission.document_id = document.id
        submission.status = "in_chart"
    saved = store.update_submission(submission)
    return {"status": saved.status, "document_id": saved.document_id}
