from __future__ import annotations

import sys

from fastapi.testclient import TestClient

from almond.api import app

c = TestClient(app)

passed: list[str] = []
failed: list[str] = []


def check(label: str, response, expect_json=True):
    ok = 200 <= response.status_code < 300
    detail = f"status={response.status_code}"
    body = None
    if expect_json:
        try:
            body = response.json()
        except Exception as exc:
            ok = False
            detail += f" json_error={exc}"
    if ok:
        passed.append(label)
        print(f"PASS {label} ({detail})")
    else:
        snippet = ""
        try:
            snippet = response.text[:300]
        except Exception:
            pass
        failed.append(f"{label} -> {detail} {snippet}")
        print(f"FAIL {label} ({detail}) {snippet}")
    return body


def assert_true(label: str, condition: bool, note: str = ""):
    if condition:
        passed.append(label)
        print(f"PASS {label} {note}".rstrip())
    else:
        failed.append(f"{label} -> assertion failed {note}")
        print(f"FAIL {label} assertion failed {note}".rstrip())


health = check("GET /v1/health", c.get("/v1/health"))
assert_true("health.ok", isinstance(health, dict) and health.get("ok") is True, str(health))

leads = check("GET /v1/leads", c.get("/v1/leads"))
assert_true("leads.is_list", isinstance(leads, list) and len(leads) > 0, f"count={len(leads) if isinstance(leads, list) else 'n/a'}")

overview = check("GET /v1/reports/overview", c.get("/v1/reports/overview"))
assert_true("overview.kpis", isinstance(overview, dict) and isinstance(overview.get("kpis"), list) and len(overview["kpis"]) > 0)

templates = check("GET /v1/forms/templates", c.get("/v1/forms/templates"))
assert_true("templates.is_list", isinstance(templates, list) and len(templates) > 0, f"count={len(templates) if isinstance(templates, list) else 'n/a'}")

connectors = check("GET /v1/settings/connectors", c.get("/v1/settings/connectors"))
assert_true("connectors.is_list", isinstance(connectors, list) and len(connectors) > 0)

users = check("GET /v1/settings/users", c.get("/v1/settings/users"))
assert_true("users.is_list", isinstance(users, list) and len(users) > 0)

audit = check("GET /v1/settings/audit", c.get("/v1/settings/audit"))
assert_true("audit.is_list", isinstance(audit, list) and len(audit) > 0)

conversations = check("GET /v1/conversations", c.get("/v1/conversations"))
assert_true("conversations.is_list", isinstance(conversations, list) and len(conversations) > 0)

patients = check("GET /v1/patients", c.get("/v1/patients"))
assert_true("patients.is_list", isinstance(patients, list) and len(patients) > 0, f"count={len(patients) if isinstance(patients, list) else 'n/a'}")

template_id = templates[0]["id"] if isinstance(templates, list) and templates else None
patient_id = patients[0]["id"] if isinstance(patients, list) and patients else None
assert_true("smoke.has_template_id", bool(template_id), f"template_id={template_id}")
assert_true("smoke.has_patient_id", bool(patient_id), f"patient_id={patient_id}")

submission_token = None
if template_id and patient_id:
    send = check(
        "POST /v1/forms/send",
        c.post("/v1/forms/send", params={"template_id": template_id, "patient_id": patient_id}),
    )
    sub = send.get("submission") if isinstance(send, dict) else None
    submission_token = sub.get("link_token") if isinstance(sub, dict) else None
    assert_true("send.returns_token", bool(submission_token), f"token={submission_token}")
    assert_true("send.status_sent", isinstance(sub, dict) and sub.get("status") == "sent", str(sub.get("status") if sub else None))

submissions = check("GET /v1/forms/submissions", c.get("/v1/forms/submissions"))
assert_true("submissions.is_list", isinstance(submissions, list) and len(submissions) > 0)

if submission_token:
    answers = {"Full legal name": "Smoke Test", "Date of birth": "1990-01-01"}
    public_submit = check(
        f"POST /v1/p/forms/{submission_token}",
        c.post(f"/v1/p/forms/{submission_token}", json=answers),
    )
    assert_true(
        "public_submit.in_chart",
        isinstance(public_submit, dict) and public_submit.get("status") == "in_chart",
        str(public_submit.get("status") if isinstance(public_submit, dict) else None),
    )
    assert_true(
        "public_submit.has_document_id",
        isinstance(public_submit, dict) and bool(public_submit.get("document_id")),
        f"document_id={public_submit.get('document_id') if isinstance(public_submit, dict) else None}",
    )

if patient_id:
    timeline = check(
        f"GET /v1/patients/{patient_id}/timeline",
        c.get(f"/v1/patients/{patient_id}/timeline"),
    )
    assert_true(
        "timeline.shape",
        isinstance(timeline, dict) and "patient" in timeline and isinstance(timeline.get("events"), list),
        f"events={len(timeline['events']) if isinstance(timeline, dict) and isinstance(timeline.get('events'), list) else 'n/a'}",
    )

H = {"Authorization": "Bearer pb_demo_token"}

login = check("POST /v1/auth/login", c.post("/v1/auth/login", json={"email": "dana@brightsmile.co", "password": "demo1234"}))
assert_true(
    "login.account_plan_core",
    isinstance(login, dict) and isinstance(login.get("account"), dict) and login["account"].get("plan") == "core",
    str(login.get("account") if isinstance(login, dict) else None),
)
assert_true(
    "login.entitlements_envelope",
    isinstance(login, dict) and isinstance(login.get("entitlements"), dict) and "quotas" in login["entitlements"],
)

bplan = check("GET /v1/billing/plan", c.get("/v1/billing/plan", headers=H))
assert_true(
    "billing.plan_core_no_stripe",
    isinstance(bplan, dict) and bplan.get("plan") == "core" and bplan.get("stripe_configured") is False,
    str(bplan.get("plan") if isinstance(bplan, dict) else None),
)

bplans = check("GET /v1/billing/plans", c.get("/v1/billing/plans", headers=H))
prices = {p["plan"]: p["price_monthly"] for p in bplans} if isinstance(bplans, list) else {}
assert_true("billing.plans_prices", prices == {"core": 199, "pro": 349, "practice_plus": 599}, str(prices))

fill_core = c.post("/v1/waitlist/fill", headers=H, json={"date_start": "2026-06-10", "date_end": "2026-06-12"})
assert_true("waitlist.fill_gated_on_core", fill_core.status_code == 402, f"status={fill_core.status_code}")

setpro = check("POST /v1/billing/dev/set-plan(pro)", c.post("/v1/billing/dev/set-plan", headers=H, json={"plan": "pro"}))
assert_true("billing.upgraded_to_pro", isinstance(setpro, dict) and setpro.get("plan") == "pro", str(setpro))

review = check("POST /v1/reviews/request", c.post("/v1/reviews/request", headers=H, json={"name": "Smoke Review", "phone": "(512) 555-0900"}))
assert_true("reviews.request_ok_on_pro", isinstance(review, dict) and bool(review.get("id")), str(review))

usage = check("GET /v1/usage", c.get("/v1/usage", headers=H))
sms_used = 0
if isinstance(usage, dict):
    for meter in usage.get("meters", []):
        if meter.get("key") == "sms_segments":
            sms_used = meter.get("used", 0)
assert_true("usage.sms_metered_after_campaign", sms_used >= 1, f"used={sms_used}")

adv = c.get("/v1/analytics/advanced", headers=H)
assert_true("analytics.advanced_ok_on_pro", adv.status_code == 200, f"status={adv.status_code}")

fill_pro = c.post("/v1/waitlist/fill", headers=H, json={"date_start": "2026-06-10", "date_end": "2026-06-12"})
assert_true("waitlist.fill_not_plan_gated_on_pro", fill_pro.status_code != 402, f"status={fill_pro.status_code}")

c.post("/v1/billing/dev/set-plan", headers=H, json={"plan": "core"})
review_core = c.post("/v1/reviews/request", headers=H, json={"name": "X", "phone": "x"})
assert_true("reviews.gated_again_after_downgrade", review_core.status_code == 402, f"status={review_core.status_code}")

print()
print(f"PASSED: {len(passed)}  FAILED: {len(failed)}")
if failed:
    print("FAILURES:")
    for f in failed:
        print(f"  - {f}")
    sys.exit(1)
print("ALL CHECKS PASSED")
