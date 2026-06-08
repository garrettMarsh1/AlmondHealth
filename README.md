# Almond

**The front office for dental & medical practices.** Capture every lead and call, book it, send digital intake forms that write a PDF straight back into the patient's chart, and message patients — all in one place, synced to the practice's existing system of record (their PMS/EHR).

> GitHub: `garrettMarsh1/AlmondHealth` · Status: working proof-of-concept, live against the **Open Dental** sandbox.

## Why it exists
Small practices run their schedule and charts in a PMS (Open Dental, Denticon, NextGen). Those are clinical systems of record, not front-office tools: they miss 30–40% of inbound calls, juggle leads in voicemail, and re-key paper intake forms by hand. Practices pay ~$10k for a single custom PMS integration. Almond is the front-office layer that bridges lead/booking/forms into the PMS with a clean UI — for a monthly subscription instead of a five-figure integration.

## Architecture
```
 React app  ─►  /v1 API (FastAPI)  ─►  DentalConnector  ─►  the practice's PMS
 (frontend)     canonical model        ├─ OpenDentalConnector  (live)
                + SQLite for our        └─ DenticonConnector     (stub; OAuth, pending key)
                own data (leads,
                forms, messages,        Leads / form templates / submissions / messages live in
                audit, users)           OUR store. Patients / appointments / charts stay in the PMS
                                        (source of truth); we mirror + write back via the connector.
```
The frontend talks **only** to `/v1` — it never knows which PMS is underneath. Adding a PMS = one new class implementing `DentalConnector`; no frontend or API changes.

## Repo layout
```
almond/
├─ README.md            ← you are here
├─ PRODUCT_BRIEF.md     product overview
├─ DESIGN_PROMPT.md     the design-system prompt that generated the prototype
├─ .claude/            Claude Code setup for contributors (CLAUDE.md, settings, slash commands)
├─ backend/            FastAPI + SQLite — see backend/README.md and backend/CONTRACT.md
│  └─ src/almond/       api.py, store.py, db.py, auth.py, notify.py,
│        routers/ · connectors/ (open_dental ✅, denticon stub)
└─ frontend/           Vite + React — see frontend/README.md
   └─ src/screens/      Login, Today, Leads, SendForm, Scheduler, Reports, Forms,
                        PatientTimeline, Messages, Settings, Onboarding, PatientForm, PatientBooking
```

## Quickstart
Two terminals. Requires Python 3.11+ and Node 20+.
```bash
# 1) backend (API on :8088)
cd backend
python3 -m venv .venv && .venv/bin/pip install -e .
PYTHONPATH=src .venv/bin/uvicorn almond.api:app --port 8088

# 2) frontend (the app you open)
cd frontend
npm install
npm run dev                      # → http://localhost:5173  (proxies /v1 to :8088)
```
Open **http://localhost:5173** and sign in: `dana@brightsmile.co` / `demo1234`.

## Demo walkthrough
1. **Sign in** → "Private AI-powered front office."
2. **Leads & calls** → click a lead → **Convert to patient in Open Dental** → a real chart is created in the PMS.
3. **Send a form** → pick that patient → Send → open `#p/form/<token>` (the patient's phone view) or hit *Simulate complete* → the intake **PDF is written into the chart**.
4. **Patient timeline** → "Saved to chart ✓."
5. **Reports & ROI** → the value story (new patients, calls recovered, $ impact, hours saved).

## What's live vs. scaffolded
- **Live:** the full loop against Open Dental's free sandbox; all screens; SQLite persistence; auth + roles.
- **Scaffolded (need external accounts):** Twilio SMS (records messages unless `ALMOND_TWILIO_*` is set), the **Denticon** connector (stub — needs a Planet DDS single-customer key), and production hosting + BAAs.

## Tech
FastAPI · Pydantic v2 · SQLite (stdlib) · httpx · Vite · React 18 · vanilla CSS design tokens.

## More
- `backend/README.md` — backend details & run.
- `backend/CONTRACT.md` — the full `/v1` API contract.
- `frontend/README.md` — frontend details & run.
- `.claude/CLAUDE.md` — conventions + how to extend (read this before contributing with Claude Code).

## Note
This handles PHI. The current build is a POC; before real patient data it needs a signed BAA, HIPAA hosting, encryption at rest, and a formal security review. See `.claude/CLAUDE.md` for the safety rules.
