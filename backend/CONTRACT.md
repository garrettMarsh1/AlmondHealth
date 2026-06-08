# PracticeBridge API Contract (v1) — FROZEN

This document is the frozen contract for the PracticeBridge backend `/v1` API. All
paths are prefixed with `/v1` unless noted (the public patient pages use `/v1/p`).
`api.py` is frozen: it only assembles routers. Feature agents implement ONLY their own
router file in `src/practicebridge/routers/` and must match the shapes below exactly.

Conventions:
- JSON request/response bodies.
- Auth is additive. Existing routes are NOT gated. Only `current_user` consumers require
  `Authorization: Bearer <token>`.
- Datetimes are ISO 8601 strings.
- Money values are numbers (USD) unless rendered as a display string (noted per field).

## Core entity shapes

### Provider
```json
{ "id": "string", "abbr": "string|null", "name": "string|null" }
```

### Operatory
```json
{ "id": "string", "name": "string|null" }
```

### Patient
```json
{ "id": "string|null", "first": "string", "last": "string", "dob": "date|null",
  "gender": "string|null", "phone": "string|null", "email": "string|null" }
```

### Slot
```json
{ "start": "datetime", "end": "datetime|null", "provider_id": "string|null",
  "operatory_id": "string|null" }
```

### Appointment
```json
{ "id": "string|null", "patient_id": "string", "start": "datetime",
  "operatory_id": "string|null", "provider_id": "string|null",
  "status": "string|null", "reason": "string|null" }
```

### Lead
```json
{ "id": "string", "name": "string", "phone": "string|null", "email": "string|null",
  "source": "string|null", "reason": "string|null", "est_value": "number|null",
  "stage": "new|contacted|booked|converted", "patient_id": "string|null" }
```

### FormField
```json
{ "type": "section|text|choice|date|yesno|signature", "label": "string",
  "required": "bool", "options": ["string"] }
```

### FormTemplate
```json
{ "id": "string", "name": "string", "category": "string|null",
  "fields": [ FormField | "string" ] }
```
Note: legacy seeded templates may contain rich `FormField` objects; the `fields`
array is untyped at the model level for backward compatibility.

### FormSubmission
```json
{ "id": "string", "template_id": "string", "patient_id": "string|null",
  "lead_id": "string|null", "status": "sent|completed|in_chart",
  "answers": { "label": "value" }, "document_id": "string|null",
  "link_token": "string|null" }
```

### Message
```json
{ "id": "string", "conversation_id": "string", "direction": "in|out|system",
  "body": "string", "author": "string|null", "channel": "sms|email",
  "status": "string|null", "created_at": "datetime|null" }
```

### Conversation
```json
{ "id": "string", "name": "string", "channel": "sms|email", "tag": "string|null",
  "patient_id": "string|null", "lead_id": "string|null", "phone": "string|null",
  "unread": "int", "last": "string|null", "when": "string|null",
  "messages": [ Message ] }
```

### User
```json
{ "id": "string", "name": "string", "email": "string", "role": "string",
  "status": "active|invited" }
```

### AuditEntry
```json
{ "id": "string", "who": "string", "action": "string", "target": "string|null",
  "when": "string|null", "sync": "string|null" }
```

---

## Auth (auth.py) — IMPLEMENTED

### POST /v1/auth/login
Body:
```json
{ "email": "string", "password": "string" }
```
200:
```json
{ "token": "string", "user": User }
```
401 on invalid credentials. Demo user: `dana@brightsmile.co` / `demo1234`.
A stable seed token `pb_demo_token` is always valid for the demo user.

Dependency `current_user` reads `Authorization: Bearer <token>` and returns a `User`
(401 if missing/invalid). `optional_user` returns `User|null` without raising.

---

## Core (routers/core.py) — IMPLEMENTED (existing, frozen behavior)

### GET /v1/health
```json
{ "ok": true, "pms": "Open Dental" }
```

### GET /v1/providers -> `[ Provider ]`

### GET /v1/operatories -> `[ Operatory ]`

### GET /v1/patients
Query: `last?`, `first?`. Returns `[ Patient ]`.

### GET /v1/appointments
Query: `date_start` (required), `date_end` (required). Returns `[ Appointment ]` with
one ADDED field per item: `patient_name: string|null` (resolved via connector
`get_patient`, cached). All original Appointment fields are unchanged.

### GET /v1/availability
Query: `date_start`, `date_end`, `minutes?` (default 60). Returns `[ Slot ]`.

### POST /v1/appointments
Body `AppointmentCreate`:
```json
{ "patient_id": "string", "start": "datetime", "operatory_id": "string",
  "provider_id": "string|null", "reason": "string|null" }
```
Returns `Appointment`.

### GET /v1/leads -> `[ Lead ]`

### POST /v1/leads
Body `LeadCreate`:
```json
{ "name": "string", "phone": "string|null", "email": "string|null",
  "source": "string|null", "reason": "string|null", "est_value": "number|null" }
```
Returns `Lead`.

### POST /v1/leads/{lead_id}/convert
Query: `operatory_id?`, `provider_id?`, `start?`. Creates a patient in the PMS, marks
the lead converted, optionally books an appointment.
```json
{ "patient": Patient, "appointment": Appointment|null, "lead": Lead }
```
404 if lead not found.

### GET /v1/forms/templates -> `[ FormTemplate ]`

### GET /v1/forms/submissions -> `[ FormSubmission ]`

### POST /v1/forms/send
Query: `template_id` (required), `patient_id?`, `lead_id?`.
```json
{ "submission": FormSubmission, "link": "/p/forms/<token>" }
```

### POST /v1/forms/submit/{token}
Body: raw JSON object of answers `{ "label": "value" }`. Marks submission completed; if
the submission has a `patient_id`, renders a PDF and uploads to the chart
(status -> `in_chart`, sets `document_id`). Returns `FormSubmission`. 404 if token
unknown.

---

## Reports (routers/reports.py) — TO IMPLEMENT

### GET /v1/reports/overview
Query: `range?` (default `"Last 30 days"`). Computed from the store.
```json
{
  "range": "Last 30 days",
  "kpis": [
    { "label": "string", "value": "number|string", "delta": "string",
      "good": "bool", "icon": "string", "note": "string" }
  ],
  "time_saved": "string",
  "chart": [ "int" ]
}
```
KPI guidance (compute from store; deltas/notes may be illustrative strings):
- `New patients captured` — count of leads with `stage == "converted"`.
  icon `userPlus`.
- `Calls recovered` — count of leads with `source == "Missed call"`. icon `phoneMissed`.
- `Forms completed` — count of submissions with `status` in `completed`/`in_chart`.
  icon `forms`.
- `Est. revenue impact` — sum of `est_value` over converted leads, rendered as a string
  like `"$48.2k"`. icon `dollar`.
`time_saved` is a display string (e.g. `"47 hrs"`). `chart` is an array of ints
(trend sparkline data).

---

## Forms (routers/forms.py) — TO IMPLEMENT

### GET /v1/forms/templates/{id}
Returns `FormTemplate`. 404 if not found.

### POST /v1/forms/templates
Body `FormTemplateCreate`:
```json
{ "name": "string", "fields": [ FormField ], "category": "string|null" }
```
Returns the created `FormTemplate` (with generated `id`).

### PUT /v1/forms/templates/{id}
Body (all optional):
```json
{ "name": "string?", "fields": [ FormField ]?, "category": "string?" }
```
Returns the updated `FormTemplate`. 404 if not found.

Use `store.get_template`, `store.create_template(name, fields, category)`,
`store.update_template(id, name=?, fields=?, category=?)`. Pass `fields` as a list of
plain dicts (use `field.model_dump()` for each `FormField`).

---

## Patient (routers/patient.py) — TO IMPLEMENT

### GET /v1/patients/{id}/timeline
Merges that patient's appointments (connector), form submissions (store), and messages
(store) into a single chronological event feed.
```json
{
  "patient": Patient,
  "events": [
    { "type": "appt|form|msg|lead", "icon": "string", "title": "string",
      "detail": "string", "when": "string", "sync": "string|null" }
  ]
}
```
Sources:
- Appointments: `connector.list_appointments(...)` filtered to `patient_id == id`
  (or per-patient lookup), `type:"appt"`, icon `calendar`, `sync:"saved"`.
- Forms: `store.list_submissions_for_patient(id)`, `type:"form"`, icon `forms`,
  `sync:"saved"` when `status == "in_chart"`.
- Messages: `store.messages_for_patient(id)`, `type:"msg"`, icon `message` (incoming)
  or `send` (outgoing).
Resolve the patient via `connector.get_patient(id)`. 404 if patient not found.

---

## Messages (routers/messages.py) — TO IMPLEMENT

### GET /v1/conversations
Returns `[ Conversation ]` (each includes its `messages` array). Use
`store.list_conversations()`.

### GET /v1/conversations/{id}
Returns a single `Conversation`. 404 if not found. Use `store.get_conversation(id)`.

### POST /v1/conversations/{id}/messages
Body `MessageCreate`:
```json
{ "text": "string" }
```
Sends via `notify.send_sms(conversation.phone, text)`, then stores the outgoing message
via `store.add_message(id, "out", text, author=<sender>, channel=<conv.channel>,
status=<send result status>)`.
```json
{ "message": Message, "delivery": { "ok": "bool", "status": "string", "provider": "string" } }
```
404 if conversation not found.

---

## Settings (routers/settings.py) — TO IMPLEMENT

### GET /v1/settings/connectors
```json
[
  { "name": "Open Dental", "kind": "PMS", "status": "connected",
    "detail": "string", "writes": true },
  { "name": "Twilio SMS", "kind": "Messaging",
    "status": "connected|available", "detail": "string", "writes": true },
  { "name": "Denticon", "kind": "PMS", "status": "available",
    "detail": "Planet DDS - cloud API", "writes": false },
  { "name": "NextGen", "kind": "EHR", "status": "available",
    "detail": "Cloud API", "writes": false }
]
```
Open Dental is always `connected` (live). Twilio status is `connected` when
`notify.twilio_configured()` is true, else `available`. Denticon and NextGen are
`available`.

### GET /v1/settings/users
Returns `[ User ]`. Use `store.list_users()`.

### GET /v1/settings/audit
Returns `[ AuditEntry ]` (newest first). Use `store.list_audit()`.

---

## Patient public (routers/patient_public.py) — TO IMPLEMENT (NO AUTH)

### GET /v1/p/forms/{token}
Public page payload for the patient phone form. No auth.
```json
{
  "practice": { "name": "string", "location": "string", "phone": "string" },
  "form": { "name": "string", "fields": [ FormField | "string" ] },
  "status": "sent|completed|in_chart"
}
```
Resolve via `store.get_submission_by_token(token)` then `store.get_template(
submission.template_id)`. Practice info comes from `settings.practice_name`,
`settings.practice_location`, `settings.practice_phone`. 404 if token unknown.

### POST /v1/p/forms/{token}
Public submit. No auth. Body = answers object `{ "label": "value" }`.
Marks the submission `completed`; if the submission has a `patient_id`, renders a PDF
(`pdf.render_form_pdf`) and uploads to the chart via the connector
(`upload_document`), setting `status -> in_chart` and `document_id`. Persist with
`store.update_submission(...)`.
```json
{ "status": "completed|in_chart", "document_id": "string|null" }
```
404 if token unknown.

---

## Store API available to routers (src/practicebridge/store.py)

Existing (used by core, do not change signatures):
`seed()`, `create_lead(LeadCreate)`, `list_leads()`, `get_lead(id)`,
`set_lead_converted(id, patient_id)`, `list_templates()`,
`create_submission(template_id, patient_id=, lead_id=)`, `get_submission(id)`,
`get_submission_by_token(token)`, `list_submissions()`.

Added:
- Templates: `get_template(id)`, `create_template(name, fields, category=)`,
  `update_template(id, name=, fields=, category=)`.
- Submissions: `update_submission(FormSubmission)`,
  `list_submissions_for_patient(patient_id)`.
- Conversations/messages: `list_conversations()`, `get_conversation(id)`,
  `create_conversation(name, channel=, tag=, patient_id=, lead_id=, phone=)`,
  `add_message(conversation_id, direction, body, author=, channel=, status=)`,
  `messages_for_patient(patient_id)`.
- Users: `list_users()`, `get_user(id)`, `get_user_by_email(email)`,
  `verify_credentials(email, password)`, `create_user(name, email, role, password, status=)`.
- Tokens: `store_token(token, user_id)`, `user_for_token(token)`.
- Audit: `append_audit(who, action, target=, when=, sync=)`, `list_audit()`.

## Notify API (src/practicebridge/notify.py)
- `twilio_configured() -> bool`
- `send_sms(to, body) -> { ok, status, to, body, provider, ... }`. With no Twilio env
  vars (`PB_TWILIO_SID`/`PB_TWILIO_TOKEN`/`PB_TWILIO_FROM`) it returns
  `status:"recorded"` and never raises.

## Persistence (src/practicebridge/db.py)
SQLite (stdlib `sqlite3`) at `backend/practicebridge.db`. `db.connect()` returns a
`Row`-factory connection; `db.init()` creates tables: `leads`, `form_templates`,
`form_submissions`, `conversations`, `messages`, `users`, `audit_log`, `auth_tokens`.
