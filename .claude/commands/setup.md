Set up the Almond repo for local development from a fresh clone.

1. Backend: `cd backend && python3 -m venv .venv && .venv/bin/pip install -e .`
2. Frontend: `cd frontend && npm install`
3. Confirm config: `backend/.env` is optional — defaults in `config.py` are the public Open Dental sandbox keys, so it runs without one. Copy `.env.example` to `.env` only to override (env prefix is `ALMOND_`).
4. Verify the backend imports and smoke passes: `cd backend && PYTHONPATH=src .venv/bin/python scripts/smoke.py`
5. Verify the frontend type-checks and builds: `cd frontend && npm run build` (runs `tsc --noEmit && vite build`)

Report any failures with the exact error. Do not start long-running dev servers as part of setup (use `/dev` for that).
