# Almond — Frontend

Vite + React (JSX) single-page app. Ports the designer's prototype to a real, buildable app wired to the backend `/v1` API. The visual design lives entirely in the CSS tokens; screens reuse shared components.

## Run
```bash
npm install
npm run dev          # → http://localhost:5173
```
The dev server proxies `/v1/*` to the backend at `http://localhost:5173` → `http://localhost:8088` (see `vite.config.js`), so no CORS setup is needed. The backend must be running (see ../backend).

Build for production:
```bash
npm run build        # outputs dist/
```

## Structure
```
src/
├─ main.jsx           entry; imports the three CSS layers
├─ App.jsx            shell, nav, hash router, login gate, role-gated nav, patient routing
├─ ui.jsx             design-system components (Icon, Button, Badge, SyncPill, Avatar,
│                     StatCard, Modal, Drawer, Toggle, Segmented, Pagination, Toast, …)
├─ ctx.jsx            NavProvider / useNav
├─ api.js             typed-ish fetch client for /v1 (+ bearer-token handling)
├─ data.js            small helpers (avatarColor, initials) + a little demo mock (messages fallback)
├─ styles/            tokens.css · ui.css · shell.css   (the "Pine & Apricot" design system — do not rewrite; reuse classes)
└─ screens/           one file per screen
```

## Screens
**Staff (behind login):** Today, Leads & calls, Scheduler, Messages, Forms (library + builder), Send a form, Patient timeline, Reports & ROI, Settings, Onboarding wizard.
**Patient (no login, full-screen, reached by hash):**
- `#p/form/<token>` → `PatientForm` — the texted-link intake form; on submit the PDF is written to the chart.
- `#p/book` → `PatientBooking` — self-scheduling.

All screens are wired live to `/v1`. Auth: `dana@brightsmile.co` / `demo1234` (Owner role sees Reports + Settings; Front Desk does not).

## How it talks to the backend
Every call goes through `api.js`, which adds `Authorization: Bearer <token>` when logged in and hits relative `/v1/...` paths (proxied to the backend). The backend's canonical model means the UI is identical regardless of which PMS is connected — see `../backend/CONTRACT.md` for the exact shapes.

## Conventions
- **No code comments** — self-documenting names (house rule; see `../.claude/CLAUDE.md`).
- Reuse `ui.jsx` components and the existing CSS classes; don't restyle ad hoc.
- New screen → add `screens/X.jsx`, import it in `App.jsx`, register the route. Run `npx vite build` before claiming done.
