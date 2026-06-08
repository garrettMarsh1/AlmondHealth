Start the Almond dev servers and report the URLs.

1. Backend API on :8088 (run in the background, don't block):
   `cd backend && PYTHONPATH=src .venv/bin/uvicorn almond.api:app --port 8088`
2. Frontend on :5173 (background):
   `cd frontend && npm run dev`
3. Wait a few seconds, then confirm both respond:
   - `curl -s localhost:8088/v1/health` → `{"ok":true,...}`
   - `curl -s -o /dev/null -w "%{http_code}" localhost:5173` → 200
4. Tell the user to open **http://localhost:5173** and sign in with `dana@brightsmile.co` / `demo1234`.

The backend logging `GET / 404` is expected (the API has no homepage; the browser only hits :5173, which proxies `/v1` to :8088). To stop: `pkill -f "almond.api"` and `pkill -f vite`.
