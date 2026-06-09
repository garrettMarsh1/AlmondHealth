# Almond — Frontend

Vite + React + TypeScript single-page app. Ports the designer's prototype to a real, buildable app wired to the backend `/v1` API. The visual design lives entirely in the CSS tokens; screens reuse shared components.

## Run
```bash
npm install
npm run dev          # → http://localhost:5175
```
The dev server proxies `/v1/*` to the backend at `http://localhost:5175` → `http://localhost:8088` (see `vite.config.ts`), so no CORS setup is needed. The backend must be running (see ../backend).

Build for production (type-checks first):
```bash
npm run build        # tsc --noEmit && vite build → dist/
npm run typecheck    # tsc --noEmit only
```

## Structure
```
src/
├─ main.tsx           entry; imports the three CSS layers
├─ App.tsx            shell, nav, hash router, login gate, role-gated nav, patient routing
├─ ui.tsx             design-system components (Icon, Button, Badge, SyncPill, Avatar,
│                     StatCard, Modal, Drawer, Toggle, Segmented, Pagination, Toast, …)
├─ ctx.tsx            NavProvider / useNav
├─ api.ts             fetch client for /v1 (typed returns + bearer-token handling)
├─ types.ts           domain types mirroring backend/CONTRACT.md (Patient, Lead, Appointment, …)
├─ data.ts            small helpers (avatarColor, initials) + a little demo mock (messages fallback)
├─ styles/            tokens.css · ui.css · shell.css   (the "Pine & Apricot" design system — do not rewrite; reuse classes)
└─ screens/           one file per screen (.tsx)
```

## Screens
**Staff (behind login):** Today, Leads & calls, Scheduler, Messages, Forms (library + builder), Send a form, Patient timeline, Reports & ROI, Settings, Onboarding wizard.
**Patient (no login, full-screen, reached by hash):**
- `#p/form/<token>` → `PatientForm` — the texted-link intake form; on submit the PDF is written to the chart.
- `#p/book` → `PatientBooking` — self-scheduling.

All screens are wired live to `/v1`. Auth: `dana@brightsmile.co` / `demo1234` (Owner role sees Reports + Settings; Front Desk does not).

## How it talks to the backend
Every call goes through `api.ts`, which adds `Authorization: Bearer <token>` when logged in and hits relative `/v1/...` paths (proxied to the backend). Response shapes are typed in `types.ts` to match the backend's canonical model, so the UI is identical regardless of which PMS is connected — see `../backend/CONTRACT.md` for the exact shapes.

## Conventions
- **TypeScript, `strict` mode.** `npm run build` fails on type errors. No `any`, no `@ts-ignore`/`@ts-expect-error` — code must genuinely type-check.
- **No code comments** — self-documenting names (house rule; see `../.claude/CLAUDE.md`).
- Reuse `ui.tsx` components and the existing CSS classes; don't restyle ad hoc.
- Relative imports are extensionless (`./ui`, `../types`), so they resolve to `.tsx`/`.ts`.
- New screen → add `screens/X.tsx` (typed props + `useState` generics), import it in `App.tsx`, register the route. Run `npm run build` before claiming done.
