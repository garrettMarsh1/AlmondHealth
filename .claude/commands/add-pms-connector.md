Add a new PMS/EHR connector to Almond. Argument: the PMS name (e.g. "denticon", "dentrix-ascend").

The whole point of the architecture is that this is the ONLY place new-PMS work happens — the frontend and the `/v1` API do not change.

Steps:
1. Read `backend/src/almond/connectors/base.py` (the `DentalConnector` interface) and `connectors/open_dental.py` (the reference implementation) and `connectors/denticon.py` (the stub).
2. Create `backend/src/almond/connectors/<pms>.py` implementing every method of `DentalConnector`: `list_providers`, `list_operatories`, `list_patients`, `get_patient`, `create_patient`, `list_appointments`, `get_open_slots`, `book_appointment`, `upload_document`. Map the PMS's native API ⇄ the canonical models in `models.py` (Patient, Appointment, Slot, Document, …). Handle that PMS's auth (OAuth2 client-credentials for Denticon/NextGen; key-based for Open Dental), rate limits, and pagination.
3. Register it in `connectors/registry.py` so a practice can select it.
4. Honor the house rule: NO code comments.
5. Verify: `cd backend && PYTHONPATH=src .venv/bin/python scripts/smoke.py`.

Notes: Denticon needs a Planet DDS single-customer partner key (info@planetdds.com); base `https://api.denticon.com`, OAuth2. NextGen's booking/slots are currently restricted by their program — confirm availability before relying on `get_open_slots`/`book_appointment` for it.
