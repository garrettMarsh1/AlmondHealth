# Almond — Backend (Open Dental POC)

The canonical front-office API over dental PMS connectors. The frontend talks only to
this `/v1` API; each PMS is a connector behind one interface. POC runs live against
Open Dental's free shared sandbox.

## Architecture
```
frontend ──► /v1 API (FastAPI, canonical) ──► DentalConnector ──► PMS
                                              ├─ OpenDentalConnector  (live, this POC)
                                              └─ DenticonConnector     (stub; OAuth, pending keys)
leads + form templates/submissions live in this backend's store (the PMS doesn't hold them).
```
Canonical models (`models.py`): Patient, Appointment, Slot, Document, Provider, Operatory, Lead, FormTemplate, FormSubmission.
Adding a PMS = one new class implementing `connectors/base.py:DentalConnector`. No frontend or API changes.

## Run
```bash
cd backend
cp .env.example .env            # defaults to Open Dental's public sandbox key
python3 -m venv .venv && .venv/bin/pip install -e .
.venv/bin/python scripts/poc_demo.py            # full loop through the connector, live sandbox
PYTHONPATH=src .venv/bin/uvicorn almond.api:app --port 8088   # the /v1 API
```

## /v1 endpoints
| Method | Path | Purpose |
|---|---|---|
| GET | /v1/health | connector name + liveness |
| GET | /v1/providers, /v1/operatories | from the PMS |
| GET | /v1/patients?last=&first= | search patients (PMS) |
| GET | /v1/appointments?date_start=&date_end= | schedule (PMS) |
| GET | /v1/availability?date_start=&date_end=&minutes= | open slots (PMS) |
| POST | /v1/appointments | book (PMS) |
| GET/POST | /v1/leads | leads (our store) |
| POST | /v1/leads/{id}/convert | create patient (+ optional book) in PMS |
| GET | /v1/forms/templates | form templates (our store) |
| POST | /v1/forms/send | issue a secure form link |
| POST | /v1/forms/submit/{token} | render PDF + upload to chart (PMS) |

## Open Dental specifics (proven)
- Base `https://api.opendental.com/api/v1`, auth header `Authorization: ODFHIR <dev>/<customer>`.
- Public sandbox key in `.env.example`. Production keys: email vendor.relations@opendental.com.
- Verified live: create patient, book appointment, upload document (PDF) to chart.

## Next
- Wire `DenticonConnector` (OAuth2 / api.denticon.com) when the single-customer partner key lands.
- Move leads/forms store to Postgres; add auth/RBAC + audit; add the sync engine (poll/webhook + write outbox).
