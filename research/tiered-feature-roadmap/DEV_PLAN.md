# Development Plan — Almond Tiered, Feature-Gated SaaS

> **Audience: the implementing Claude Code agent.** Derived entirely from `REPORT.md` (as of
> 2026-06-09) — every decision traces there. Read `REPORT.md` §3 (Recommended approach), §10
> (Guidance), and §6 (gotchas) before starting. If a step conflicts with what you find in the real
> code, trust the code and note the drift. **House rule: emit NO code comments anywhere.**

| Field | Value |
|---|---|
| Goal | Turn Almond from a single-tenant, role-gated POC into a tiered, feature-gated, per-location SaaS (plan→feature gating + usage metering + Stripe billing) without breaking the frozen `/v1` contract or the core-loop wedge |
| Derived from | `REPORT.md` (as of 2026-06-09) |
| Recommended approach | Additive entitlement + per-location billing layer wrapping existing endpoints; 3 tiers (Core/Pro/Practice+) + metered add-ons; DB = gating truth, Stripe = billing truth |
| Prerequisites | Stripe account (test mode); a Postgres instance (for P5); BAA vendors TBD for AI/payments/eligibility before real PHI; `backend/.venv` working; frontend `npm install` done |
| Assumptions | The frozen-contract + house-rule constraints in `REPORT.md` hold; pricing ($199/$349/$599) is provisional pending pilot WTP; this is paper/sandbox until BAAs land |

---

## 1. Objective & success criteria

Add a multi-tenant `Account` model, a plan→feature entitlement matrix, API + UI feature gating, per-location usage metering for the AI/comms cost-drivers, and Stripe Billing — so features gate by plan and price rises (sliding scale) as practices want more.

- [ ] A `require_feature('x')`-gated endpoint returns **402 + upgrade payload** for a Core account and **200** for an entitled plan; existing `/v1` core routes behave **identically** (clean contract diff).
- [ ] Tier membership is a **single source-of-truth `PLAN_FEATURES` dict** — no gating logic scattered in routers.
- [ ] The 3 per-location meters (`sms_segments`, `ai_minutes`, `eligibility_checks`) increment at the point of action; `GET /v1/usage` reports counts vs caps; transactional/two-way SMS are **not** counted.
- [ ] A Stripe subscription lifecycle (create/update/cancel) flips `Account.plan` in our DB **via webhook**; gating still reads only from the DB; **no PHI** in any Stripe payload.
- [ ] A Core user sees Pro/Practice+ screens as **locked with an `UpgradePrompt`**; hitting a usage cap shows an at-the-moment add-credits/upgrade CTA.
- [ ] Runs on **Postgres** with atomic usage upserts; every entitlement/usage/billing query is **`account_id`-scoped** (cross-tenant isolation test passes).
- [ ] AI voice / payments / reviews / eligibility remain in **`recorded`/sandbox mode**, tier-gated to Practice+, pending signed BAAs.
- [ ] Backend smoke green (`scripts/smoke.py`), `npm run build` green; **zero code comments** added.

## 2. Architecture / approach

Additive layer over the existing FastAPI app — new modules + additive columns; the frozen `api.py` only gains router includes, and frozen `/v1` shapes are untouched.

```
                        ┌─────────────────────────────────────────────┐
  React/TS frontend     │  App.tsx nav gating: isOwner() + plan check  │
  (api.ts → /v1)        │  ui.tsx <UpgradePrompt/> ; at-cap CTAs        │
                        └───────────────┬─────────────────────────────┘
                                        │  402 plan-locked / 402-429 quota
                        ┌───────────────▼─────────────────────────────┐
  FastAPI /v1           │  existing routers (UNGATED, frozen)          │
                        │  NEW routers: billing.py, usage.py,          │
                        │   analytics.py / waitlist.py / reviews.py    │
                        │      └─ Depends(require_feature / require_quota)
                        └───────┬───────────────────────┬─────────────┘
                                │ reads gating from      │ increments meters
                        ┌───────▼────────┐       ┌───────▼───────────┐
  entitlements.py       │ PLAN_FEATURES   │       │ usage_events (+)  │
                        │ dict[plan→keys] │       │ usage_counters    │
                        └───────┬─────────┘       └───────┬───────────┘
                                │                         │ aggregate period counts
   our DB (SQLite→PG)   ┌───────▼─────────────────────────▼───────────┐
   = GATING SOURCE OF   │ accounts · subscriptions · usage_* · users  │
   TRUTH                │ (account_id-scoped everywhere)              │
                        └───────▲─────────────────────────────────────┘
                                │ webhooks (subscription.*, invoice.*)  ← Stripe = BILLING truth
                        ┌───────┴──────────┐
   Stripe Billing       │ Checkout · Portal · Meters · Meter Events    │  (de-identified only — NO PHI)
                        └──────────────────┘
```

- **Components:** `entitlements.py` (Plan enum `{core,pro,practice_plus}`, `FEATURE_KEYS`, `PLAN_FEATURES`, `require_feature()`, `require_quota()`); `models.py` adds `Account`/`Subscription`/`UsageEvent` (+ `User.account_id` additively); `db.py` adds `accounts`/`subscriptions`/`usage_events`/`usage_counters`; `routers/billing.py` + `routers/usage.py`; `config.py` `ALMOND_STRIPE_*`; `notify.send_sms` meter hook; later a connector eligibility (270/271) method.
- **Key contracts:** `require_feature`/`require_quota` are pure FastAPI dependencies built on `auth.current_user`; gating reads ONLY from our DB; Stripe mirrored via webhooks; `usage_counters` updated by atomic upsert. Login payload gains `account.plan` + `entitlements` (additive envelope).
- **Source of truth:** our DB for entitlement/gating reads; Stripe for billing. Never call Stripe synchronously on a request.

## 3. Milestones / phases

| Phase | Goal | Exit criterion |
|---|---|---|
| **P0** Foundations: tenancy + entitlement skeleton | Add `Account` + `plan`, and a working `require_feature`/`require_quota`, every account seeded to a default plan, gating no existing route | A test endpoint gated by `require_feature('demo_premium')` → 402+payload for Core, 200 for Pro; existing `/v1` unchanged; login adds `account.plan`+`entitlements`; demo account seeded |
| **P1** Plan→feature matrix + premium gating | Canonical `feature_key` set + `PLAN_FEATURES`; apply `require_feature` to NEW/premium endpoints only | Premium NEW endpoints 402 for plans lacking them; `CONTRACT.md` core routes unchanged/ungated; matrix is one dict |
| **P2** Usage metering + quotas | Three per-location meters; instrument `send_sms`; enforce caps via `require_quota` with at-cap triggers | Campaign SMS increments `sms_segments`; `GET /v1/usage` shows counts vs caps; cap exceed → 402/429 + add-credits payload; transactional SMS not counted |
| **P3** Stripe Billing (tiered + metered), DB = gating truth | Checkout for per-location subs + metered prices; webhook sync to DB; push period usage; PHI out of Stripe | Stripe sub create/update/cancel flips `Account.plan` via webhook; metered usage reports; gating reads DB only; zero PHI in payloads; pilot/trial supported |
| **P4** Frontend gating + upgrade prompts | Extend `App.tsx` nav/router gating to plan entitlements; locked-feature + at-cap CTAs | Core user sees Pro/Practice+ as locked with `UpgradePrompt`; entitlements from login payload; cap-hit shows in-app CTA |
| **P5** Postgres + production hardening | Move to Postgres (concurrency), Alembic, abstract `db.connect`, BAA/SOC2 gating for AI/payments/reviews/eligibility | Runs on Postgres with atomic upserts; Alembic clean; all queries `account_id`-scoped; PHI features sandboxed + Practice+-gated pending BAAs |

## 4. Work breakdown

| ID | Task | Files to create / modify | Deps | Size | Risk | Verify |
|---|---|---|---|---|---|---|
| **T1** | Add `Account`/`Subscription`/`UsageEvent` models; add `accounts`/`subscriptions`/`usage_events`/`usage_counters` tables to `db._SCHEMA`; add `users.account_id` via `PRAGMA table_info`+`ALTER TABLE`; add `_seed_account` to `store.seed()` (demo→`plan='core'`, link users) | `models.py`, `db.py`, `store.py` | — | M | Med — must not alter frozen `User` shape | `store.seed()` idempotent; demo users carry `account_id`; tables exist; existing endpoints unchanged |
| **T2** | Create `entitlements.py`: `Plan` enum, `FEATURE_KEYS`, `PLAN_FEATURES`, `require_feature(key)` + `require_quota(meter)` on `auth.current_user` (NOT `require_role`); 402 + upgrade payload; resolve Account from `User.account_id` | `entitlements.py` (new), `auth.py` (reuse `current_user` only) | T1 | M | Med — `require_role` is broken; inject `Depends(current_user)` explicitly | Unit test: returns user for entitled plan, 402 otherwise; `require_quota` 402/429 at cap |
| **T3** | Temp test endpoint gated by `require_feature` to validate end-to-end; confirm core routes ungated; add `account.plan`+`entitlements` to `/v1/auth/login` additively | temp router, `auth.py` (login payload), `api.py` (include only) | T2 | S | Low — additive only | Login payload has plan+entitlements; gated endpoint 402 Core / 200 Pro; core routes contract-diff clean |
| **T4** | Finalize `feature_key` set + `PLAN_FEATURES` (Core/Pro/Practice+); scaffold NEW premium endpoints (advanced analytics, waitlist, reviews) behind `require_feature`; leave core-loop ungated | `entitlements.py`, `routers/analytics.py` + `routers/waitlist.py` + `routers/reviews.py` (new), `api.py` (includes) | T2,T3 | M | Med — tier placement is a product call; keep matrix single source | Each premium endpoint 402s for plans lacking it; core open; no scattered gates |
| **T5** | Usage metering: `usage_events` append + `usage_counters` upsert per account/location/meter/period; instrument `notify.send_sms` (campaign/bulk only); `GET /v1/usage`; enforce caps via `require_quota` with at-cap payload | `store.py` (usage helpers), `notify.py`, `routers/usage.py` (new), `entitlements.py`, `db.py` | T1,T2 | L | High — SQLite concurrency; don't enable hard metered billing until P5 | Campaign SMS increments counter; `/v1/usage` counts vs caps; transactional SMS not counted; cap exceed 402/429 |
| **T6** | Stripe Billing: `ALMOND_STRIPE_*` config; `routers/billing.py` Checkout (per-location qty + metered prices) + webhook handler syncing `subscription.*` to `Account.plan`; push period usage to Stripe meters; **no PHI** in payloads; pilot/trial state | `config.py`, `routers/billing.py` (new), `store.py` (sub sync), `api.py` (include) | T1,T5 | L | High — webhook reliability/idempotency, PHI exclusion, Stripe API drift | Test webhooks flip plan in DB; gating reads DB only; usage reports; payload audited for zero PHI |
| **T7** | Frontend gating + upgrade prompts: extend `types.ts` (Account/plan/entitlements, additive); `api.ts` billing/usage calls; `App.tsx` plan check beside `isOwner` + locked-screen CTAs + at-cap prompts; `ui.tsx` `UpgradePrompt`; wire `Reports.tsx` to real `revenue_breakdown` | `frontend/src/types.ts`, `api.ts`, `App.tsx`, `ui.tsx`, `screens/Reports.tsx` | T3,T4,T5 | M | Med — don't break role-gated nav for accounts lacking plan data | Core user sees locked Pro screens w/ `UpgradePrompt`; at-cap CTA; Reports uses backend breakdown; nav intact |
| **T8** | Postgres + hardening: abstract `db.connect`; Alembic; port schema; `usage_counters` atomic upsert (`ON CONFLICT DO UPDATE`); all entitlement/usage/billing queries `account_id`-scoped; AI/payments/reviews/eligibility in `recorded`/sandbox + Practice+-gated pending BAAs | `db.py`, `store.py`, `alembic/` (new), `connectors/registry.py` (per-account), `entitlements.py` | T5,T6 | L | High — broad blast radius across `db.connect` call sites; data-migration correctness | Runs on Postgres; concurrent SMS increments atomic/correct; Alembic up/down clean; account A cannot read account B |

## 5. Sequencing & parallelization

- **Critical path:** T1 → T2 → T3 → (T4 ∥ T5) → T6 → T8. T7 trails T3/T4/T5.
- **Parallelizable (disjoint files):**
  - After T2/T3: **T4** (new premium routers + matrix) ∥ **T5** (metering: `store.py`/`notify.py`/`routers/usage.py`) — minimal overlap (both touch `entitlements.py` for the matrix vs `require_quota`; split so T4 owns `PLAN_FEATURES`, T5 owns `require_quota`).
  - **T7** (frontend, entirely `frontend/src/*`) can start against mocked entitlements as soon as the login-payload shape from T3 is fixed, in parallel with T5/T6.
- **Suggested orchestration (Workflow):** foundation **T1→T2→T3** (sequential, shared backend files) → `parallel(T4, T5, T7-frontend-shell)` → **T6** → **T8**. Use worktree isolation only if two agents must edit `entitlements.py`/`api.py` at once; otherwise serialize those two files.
- **Do P0–P2 on SQLite** (fast iteration); **gate the P3 metered-billing enablement on P5 Postgres** — wire Stripe in P3 but don't flip on hard caps/overage until Postgres lands.

## 6. Risks & mitigations

| Risk (from `REPORT.md` §6) | Likelihood × impact | Mitigation | Fallback |
|---|---|---|---|
| Copying broken `require_role` → always-401 in `require_feature` | Med × High (blocks all gated routes) | Write fresh with `user: User = Depends(current_user)`; unit-test an entitled Core/Pro pair | Inline auth resolution per gated route, then refactor |
| SQLite single-writer lock corrupts concurrent usage increments → wrong overage bills | High (under load) × High | Treat SQLite metering as POC-only; no hard caps/overage until Postgres (P5) w/ atomic upsert | Serialize meter writes via a single async queue; reconcile from append-only `usage_events` |
| PHI leaks into Stripe metadata (Stripe is not a BAA vendor) | Low-Med × Very High (breach) | Send only de-identified billing data; payload allowlist + test asserting no patient fields | Block the Stripe call if payload fails allowlist; alert |
| Changing a frozen `/v1` shape (e.g. plan on `User`) breaks the contract | Med × High | Keep `User` frozen; deliver plan/entitlements via login envelope + new endpoints; diff vs `CONTRACT.md` | Revert field; expose plan only via `GET /v1/billing/plan` |
| Missing `account_id` scope leaks PHI/billing across practices | Med × Very High | All entitlement/usage/billing helpers take `account_id` (required arg); cross-tenant isolation test | Defensive middleware injecting/validating `account_id` on gated requests |
| Gating the core loop / mispricing destroys the wedge vs NexHealth | Med × High (commercial) | Keep whole core loop in Core; Core under $350; gate only differentiators/AI/governance; validate fences vs WTP not the (directional) competitor ladder | Move over-fenced feature back to Core via a one-line matrix edit |
| Shipping AI voice/payments/reviews/eligibility against real PHI before BAAs | Med × Very High (compliance) | Keep in `recorded`/sandbox (notify already returns 'recorded'); Practice+-gated; require a BAA-signed flag before real PHI | Feature flag forces sandbox until BAA flag set per account |
| Stripe API/SDK drift breaks metered reporting | Med × Med | Pin Stripe SDK; verify current Meter/Events API at build; webhook idempotency keys | Fall back to licensed-only subs; reconcile overages manually until meter API confirmed |

## 7. Testing & verification

- **Unit/component:** `require_feature` (entitled→user, else 402) and `require_quota` (under cap→user, at cap→402/429); `PLAN_FEATURES` is the only gate source; `usage_counters` upsert is atomic (Postgres).
- **Integration/e2e (happy path):** seed demo Core account → call a Pro-only endpoint → 402+upgrade → "upgrade" account to Pro (simulate webhook) → same call 200; send N campaign SMS → `GET /v1/usage` shows N → exceed cap → 402/429 + add-credits.
- **Contract regression:** diff all existing `/v1` responses against `CONTRACT.md` — must be unchanged except the additive login envelope. Run `backend/scripts/smoke.py` → `ALL CHECKS PASSED`.
- **Compliance/isolation:** assert no patient fields in any Stripe payload (allowlist test); cross-tenant test (account A cannot read account B's usage/billing).
- **Build:** `cd frontend && npm run build` (tsc --noEmit && vite build) exit 0; backend imports clean.
- **Commands:** `cd backend && PYTHONPATH=src .venv/bin/python scripts/smoke.py` · `cd frontend && npm run build`.

## 8. Out of scope / future

- Building the premium features' *internals* (AI voice engine, payments processor integration, review-platform connectors, 270/271 clearinghouse) — this plan adds the **gating + metering + billing scaffold** around them; revisit each when its BAA vendor is chosen.
- Full HIPAA program (SOC 2 audit, BAA inventory, pen-test) — required before real PHI; track separately.
- Annual billing, coupons/discounts, multi-currency, dunning emails — add after the monthly per-location model is live.
- Self-serve onboarding/zero-touch trial — revisit only if a practice can reach first value without an integration call.

## 9. Open questions blocking work

- **Exact price points** (Core/Pro/Practice+ $) — options: launch at $199/$349/$599 provisional vs run a pricing pilot first; **recommended default: provisional, validate in the first paid pilots.** Blocks: final Stripe Price objects in T6 (use test prices until set).
- **Feature→tier fences** — the competitor ladder is directional only; options: ship the recommended matrix vs validate each fence with pilot WTP; **default: ship recommended, keep matrix one-line-editable.** Blocks: T4 final matrix.
- **A2P 10DLC fee** — absorb vs pass-through; **default: absorb for cleaner pricing.** Blocks: nothing hard; affects margin model.
- **BAA vendors** for AI voice / PHI-linked payments / eligibility — **default: keep sandboxed + Practice+-gated until chosen.** Blocks: enabling those features against real PHI (P5), not the scaffold.

## 10. Agent handoff — start here

1. Read `REPORT.md` §3 (Recommended approach), §10 (Guidance), §6 (gotchas), and §5 (Key facts) — especially the `auth.require_role` bug and the frozen-contract rule.
2. Satisfy prerequisites: working `backend/.venv`, frontend deps, a Stripe **test** account (Postgres only needed at P5).
3. Begin at **T1** (tenancy + tables) — it de-risks everything; then T2 (`entitlements.py` built fresh on `current_user`), then T3 (prove gating + additive login payload).
4. Then fan out **T4 ∥ T5 ∥ T7-shell**; converge on **T6** (Stripe), finish with **T8** (Postgres + isolation).
5. Verify each phase against §7 before moving on (smoke + contract diff + build). Keep the core loop ungated, keep PHI out of Stripe, and write **zero code comments**. Update this file's checkboxes as you go.
