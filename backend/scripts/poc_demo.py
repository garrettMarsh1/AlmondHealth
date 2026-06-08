from __future__ import annotations

import secrets
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))
from almond import store  # noqa: E402
from almond.connectors.registry import connector_for  # noqa: E402
from almond.models import AppointmentCreate, LeadCreate, PatientCreate  # noqa: E402
from almond.pdf import render_form_pdf  # noqa: E402


def main():
    store.seed()
    c = connector_for("demo")
    print(f"PMS connector: {c.name}\n")

    provs = c.list_providers()
    ops = c.list_operatories()
    prov_id, op_id = provs[0].id, ops[0].id
    print(f"[setup] provider={prov_id} ({provs[0].name})  operatory={op_id}")

    lead = store.create_lead(LeadCreate(name="Jordan Rivera", phone="503-555-0173",
                                        source="Website request", reason="New patient cleaning + exam",
                                        est_value=240))
    print(f"[1] lead captured: {lead.id}  stage={lead.stage}  est_value=${lead.est_value:.0f}")

    sfx = secrets.token_hex(2)
    pat = c.create_patient(PatientCreate(first="Jordan", last=f"Rivera-{sfx}", dob="1988-09-03",
                                         gender="Female", phone=lead.phone, email="jordan@example.com"))
    store.set_lead_converted(lead.id, pat.id)
    print(f"[2] lead -> PATIENT in PMS: PatNum={pat.id}  lead now stage={store.get_lead(lead.id).stage}")

    appt = c.book_appointment(AppointmentCreate(patient_id=pat.id, start="2026-12-16 09:00:00",
                                                operatory_id=op_id, provider_id=prov_id, reason=lead.reason))
    print(f"[3] APPOINTMENT booked in PMS: AptNum={appt.id}  status={appt.status}  start={appt.start}")

    sub = store.create_submission("tmpl_intake", patient_id=pat.id)
    print(f"[4] intake form sent (secure link token {sub.link_token[:8]}…)  status={sub.status}")

    answers = {"Full name": "Jordan Rivera", "Date of birth": "1988-09-03",
               "Chief complaint": "cleaning + exam", "Consent to treat": "signed 2026-06-08"}
    pdf = render_form_pdf("New Patient Intake — Almond", [f"{k}: {v}" for k, v in answers.items()])
    doc = c.upload_document(pat.id, pdf, "Intake Form (Almond POC)")
    sub.document_id = doc.id
    sub.status = "in_chart"
    print(f"[5] patient submitted -> PDF -> CHART: DocNum={doc.id}  form status={sub.status}")

    print(f"\nLOOP OK  (all through the canonical connector, live Open Dental sandbox)")
    print(f"  lead {lead.id} -> patient {pat.id} -> appt {appt.id} -> intake DocNum {doc.id} in chart")


if __name__ == "__main__":
    main()
