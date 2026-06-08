Verify Almond end-to-end before declaring any change done.

1. Backend smoke (in-process FastAPI TestClient; exercises the live form→chart loop against Open Dental):
   `cd backend && PYTHONPATH=src .venv/bin/python scripts/smoke.py`
   Expect `ALL CHECKS PASSED`.
2. Frontend build:
   `cd frontend && npx vite build`
   Expect exit 0, no errors.

If either fails, read the offending file, fix it, and re-run until green. Report exactly what passed/failed and what you changed.
