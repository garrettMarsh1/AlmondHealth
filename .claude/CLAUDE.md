# Almond — Claude Code guide

Read this before contributing. It's the working context for the repo.

## What this is
Almond is the **front office for dental & medical practices**: capture leads/calls → book → send digital forms that write a PDF back into the patient's chart → message patients, all synced to the practice's PMS. POC runs live against the **Open Dental** sandbox.

## The one architectural idea
```
frontend (React) ─► /v1 API (FastAPI, canonical model) ─► DentalConnector ─► the PMS
```
- The frontend talks **only** to `/v1`. It never knows which PMS is underneath.
- Each PMS is a connector implementing `backend/src/almond/connectors/base.py:DentalConnector`.
- **Source of truth:** the PMS owns patients/appointments/charts. Our SQLite store owns the front-office data the PMS lacks: leads, form templates, submissions, conversations/messages, users, audit.
- The full `/v1` contract is frozen in `backend/CONTRACT.md`. Read it before touching endpoints or wiring screens.

## House rules (non-negotiable)
- **NO code comments. Anywhere. Any language.** Write self-documenting code (clear names, small functions). This is the owner's standing rule — markdown/JSON config is fine, code is not.
- Match the surrounding style. Reuse existing components/patterns; don't introduce new libraries casually.
- Don't break working endpoints or the OpenDentalConnector.

## Run it
Backend (API on :8088) and frontend (:5175) in separate terminals:
```bash
cd backend  && PYTHONPATH=src .venv/bin/uvicorn almond.api:app --port 8088
cd frontend && npm run dev          # → http://localhost:5175
```
The frontend dev port is **5175** on purpose — **never use 5173** (reserved for the owner's day-job dev server).
First-time setup: `cd backend && python3 -m venv .venv && .venv/bin/pip install -e .` and `cd frontend && npm install`.
Login: `dana@brightsmile.co` / `demo1234`. (Slash commands: `/setup`, `/dev`, `/smoke`.)

## Verify before claiming done (always)
- Backend: `cd backend && PYTHONPATH=src .venv/bin/python scripts/smoke.py` (in-process FastAPI TestClient; exercises the live form→chart loop).
- Frontend: `cd frontend && npm run build` (runs `tsc --noEmit && vite build`; must exit 0). Type-check only: `npm run typecheck`. Don't start a dev server inside an agent — it hangs.

## How to extend
- **Add a PMS connector:** implement `connectors/base.py:DentalConnector` in `connectors/<pms>.py`, register it in `connectors/registry.py`. The Denticon stub (`connectors/denticon.py`) shows the shape; it needs a Planet DDS single-customer key. Nothing in the API or frontend changes.
- **Add an endpoint:** add it to the right file in `backend/src/almond/routers/` (each feature is its own `APIRouter`, included in `api.py`), update `CONTRACT.md`, add a smoke assertion.
- **Add a screen:** create `frontend/src/screens/X.tsx` (reuse `ui.tsx` components + the CSS classes + `api.ts`; type props and `useState` generics, import domain types from `../types`), import + register it in `App.tsx`. Port from the prototype look; wire to `/v1`.
- **Add a gated/premium feature:** add its `feature_key` to `entitlements.py:PLAN_FEATURES` (and a `QUOTAS` entry if metered), put the endpoint in a router wrapped with `require_feature(key)` (+ `require_quota(meter)`), and gate the screen with `hasFeature()` + `<UpgradePrompt>`. **Never gate an existing core route.** Update `CONTRACT.md` §v1.1 and add a smoke assertion.

## Tiers, entitlements & billing (v1.1)
- 3 plans priced **per location**: Core $199 / Pro $349 / Practice+ $599+. The matrix is the single source of truth in `backend/src/almond/entitlements.py` (`PLAN_FEATURES`, `QUOTAS`).
- **Never fence the core loop** (leads, scheduling, forms→chart, two-way messaging, basic reports) — it's the price+ease wedge. Gate only growth/AI/governance features.
- **Gating reads from our DB; Stripe is billing-only** (synced via `POST /v1/billing/webhook`, never called on the request path). **Never send PHI to Stripe.**
- **Demo upgrade switch:** with no Stripe keys, `POST /v1/billing/dev/set-plan {plan}` (Owner/Admin) flips the plan instantly so you can show the sliding scale; with `ALMOND_STRIPE_*` set it routes through Stripe Checkout.
- Only **campaign** SMS is metered (`notify.send_sms(..., category="campaign")`); transactional/two-way is never counted.
- AI voice / payments / eligibility are Practice+ keys in **recorded/sandbox** mode pending signed BAAs — no real PHI through them yet. Postgres is required before metered billing goes live (SQLite can't do concurrent increments).
- Frontend: entitlements persist via `frontend/src/entitlements.ts` (`hasFeature`); gated screens render `<UpgradePrompt>`; `ApiError.status === 402` signals a gate. Full shapes in `backend/CONTRACT.md` §v1.1.

## Key files
- `backend/src/almond/api.py` — app + router includes.
- `backend/src/almond/db.py` / `store.py` — SQLite persistence + seed (DB at `backend/almond.db`, gitignored, reseeds on first run).
- `backend/src/almond/connectors/open_dental.py` — the live connector (auth `ODFHIR <dev>/<customer>`, base `https://api.opendental.com/api/v1`).
- `backend/CONTRACT.md` — every `/v1` endpoint + shape.
- `backend/src/almond/entitlements.py` — plan→feature matrix, quotas, `require_feature`/`require_quota`.
- `frontend/src/{App,ui,ctx}.tsx`, `frontend/src/{api,types,data,entitlements}.ts`, `frontend/src/screens/*.tsx`, `frontend/src/styles/*`.

## Gotchas
- **Config env prefix is `ALMOND_`** (`config.py`); see `backend/.env.example`. Defaults are the public Open Dental sandbox keys, so it runs with no `.env`.
- **Open Dental sandbox** uses a published shared test key — fine for dev; it writes to a shared test database. Don't point it at real PHI.
- **Twilio** (`notify.py`) records messages unless `ALMOND_TWILIO_SID/TOKEN/FROM` are set — the app works with no Twilio.
- **Auth is additive** — existing routes work without a token; the seed bearer token + demo login exist for the UI.
- Moving the repo folder breaks `backend/.venv` (absolute paths) — recreate it if you relocate.

## PMS status (reality)
- **Open Dental** — live, full loop (create patient, book, upload document to chart).
- **Denticon (Planet DDS)** — supports the full loop; gated partner key (info@planetdds.com, single-customer agreement). Stub ready.
- **NextGen** — clinical/records API exists, but appointment **booking/slots are currently restricted** by their program; verify before promising booking.

## Safety (PHI)
This handles PHI. Keep the AI/automation a documentation assistant with human review; never auto-file prescriptions or autonomous clinical actions. Before real data: BAAs, HIPAA hosting, encryption at rest, audit retention, formal security review.
