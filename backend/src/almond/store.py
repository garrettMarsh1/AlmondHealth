from __future__ import annotations

import json
import secrets
from datetime import datetime, timedelta, timezone

from . import db
from .config import settings
from .models import (
    Account,
    AuditEntry,
    Conversation,
    FormSubmission,
    FormTemplate,
    Lead,
    LeadCreate,
    Message,
    ReviewRequest,
    User,
    WaitlistEntry,
)


def _new_id(prefix: str) -> str:
    return f"{prefix}_{secrets.token_hex(4)}"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_lead(r) -> Lead:
    return Lead(
        id=r["id"], name=r["name"], phone=r["phone"], email=r["email"],
        source=r["source"], reason=r["reason"], est_value=r["est_value"],
        stage=r["stage"], patient_id=r["patient_id"],
    )


def _row_to_template(r) -> FormTemplate:
    return FormTemplate(id=r["id"], name=r["name"], category=r["category"],
                        fields=json.loads(r["fields"]))


def _row_to_submission(r) -> FormSubmission:
    return FormSubmission(
        id=r["id"], template_id=r["template_id"], patient_id=r["patient_id"],
        lead_id=r["lead_id"], status=r["status"], answers=json.loads(r["answers"]),
        document_id=r["document_id"], link_token=r["link_token"],
    )


def _row_to_message(r) -> Message:
    return Message(
        id=r["id"], conversation_id=r["conversation_id"], direction=r["direction"],
        body=r["body"], author=r["author"], channel=r["channel"],
        status=r["status"], created_at=r["created_at"],
    )


def _row_to_conversation(r, messages: list[Message]) -> Conversation:
    unread = sum(1 for m in messages if m.direction == "in" and m.status == "unread")
    return Conversation(
        id=r["id"], name=r["name"], channel=r["channel"], tag=r["tag"],
        patient_id=r["patient_id"], lead_id=r["lead_id"], phone=r["phone"],
        unread=unread, last=r["last"], when=r["last_when"], messages=messages,
    )


def _row_to_user(r) -> User:
    return User(id=r["id"], name=r["name"], email=r["email"], role=r["role"],
                status=r["status"])


def _row_to_audit(r) -> AuditEntry:
    return AuditEntry(id=r["id"], who=r["who"], action=r["action"],
                      target=r["target"], when=r["when_at"], sync=r["sync"])


def seed() -> None:
    db.init()
    conn = db.connect()
    try:
        _ensure_submission_created_at(conn)
        _ensure_users_account_id(conn)
        _seed_templates(conn)
        _seed_leads(conn)
        _seed_history(conn)
        _seed_users(conn)
        _seed_account(conn)
        _seed_conversations(conn)
        _seed_audit(conn)
        _seed_waitlist(conn)
        _seed_reviews(conn)
        conn.commit()
    finally:
        conn.close()


def _ensure_submission_created_at(conn) -> None:
    columns = {r["name"] for r in conn.execute("PRAGMA table_info(form_submissions)").fetchall()}
    if "created_at" not in columns:
        conn.execute("ALTER TABLE form_submissions ADD COLUMN created_at TEXT")


def _seed_templates(conn) -> None:
    if conn.execute("SELECT COUNT(*) c FROM form_templates").fetchone()["c"]:
        return
    intake_fields = [
        {"type": "section", "label": "Patient Information", "required": False, "options": []},
        {"type": "text", "label": "Full legal name", "required": True, "options": []},
        {"type": "date", "label": "Date of birth", "required": True, "options": []},
        {"type": "choice", "label": "Sex assigned at birth", "required": True, "options": ["Female", "Male", "Other"]},
        {"type": "text", "label": "Mobile phone", "required": True, "options": []},
        {"type": "yesno", "label": "Are you currently taking any medications?", "required": True, "options": []},
        {"type": "section", "label": "Consent", "required": False, "options": []},
        {"type": "signature", "label": "Patient signature", "required": True, "options": []},
    ]
    medhist_fields = [
        {"type": "text", "label": "Conditions", "required": False, "options": []},
        {"type": "text", "label": "Medications", "required": False, "options": []},
        {"type": "text", "label": "Allergies", "required": False, "options": []},
        {"type": "date", "label": "Last physical", "required": False, "options": []},
    ]
    consent_fields = [
        {"type": "yesno", "label": "Acknowledged", "required": True, "options": []},
        {"type": "signature", "label": "Signature", "required": True, "options": []},
    ]
    rows = [
        ("tmpl_intake", "New Patient Intake", "Intake", intake_fields),
        ("tmpl_medhist", "Medical History", "Medical", medhist_fields),
        ("tmpl_consent", "HIPAA Consent", "Consent", consent_fields),
    ]
    for tid, name, category, fields in rows:
        conn.execute(
            "INSERT INTO form_templates (id, name, category, fields) VALUES (?, ?, ?, ?)",
            (tid, name, category, json.dumps(fields)),
        )


_OPEN_LEADS = [
    ("Marcus Reyes", "(512) 555-0182", "Missed call", "Toothache, wants urgent visit", 285.0, "new"),
    ("Priya Anand", "(512) 555-0143", "Website request", "New patient cleaning + exam", 240.0, "new"),
    ("Tom Becker", "(512) 555-0119", "Missed call", "Crown consult", 1200.0, "contacted"),
    ("Sofia Martens", "(512) 555-0167", "Referral", "Invisalign interest", 4800.0, "contacted"),
    ("Kevin Liu", "(512) 555-0155", "Website request", "Cleaning", 180.0, "booked"),
]

_HISTORY_FIRST = [
    "Olivia", "Liam", "Emma", "Noah", "Ava", "Ethan", "Sophia", "Mason", "Isabella", "Logan",
    "Mia", "Lucas", "Charlotte", "Jackson", "Amelia", "Aiden", "Harper", "Elijah", "Evelyn", "Caleb",
    "Abigail", "Ryan", "Emily", "Nathan", "Ella", "Carter", "Grace", "Wyatt", "Chloe", "Owen",
    "Victoria", "Dylan", "Aria", "Hunter", "Scarlett", "Levi", "Lily", "Isaac", "Zoe", "Gabriel",
    "Hannah", "Julian", "Layla", "Adrian", "Nora", "Leo", "Riley", "Eli", "Penelope", "Miles",
]

_HISTORY_LAST = [
    "Carter", "Nguyen", "Patel", "Brooks", "Rivera", "Sullivan", "Foster", "Hughes", "Coleman", "Bryant",
    "Diaz", "Henderson", "Ward", "Russell", "Griffin", "Perry", "Long", "Powell", "Hayes", "Butler",
    "Barnes", "Fisher", "Stevens", "Murphy", "Reed", "Cook", "Morgan", "Bell", "Bailey", "Cooper",
    "Richardson", "Cox", "Howard", "Torres", "Peterson", "Gray", "Ramirez", "James", "Watson", "Brooks",
]

_HISTORY_SOURCES = [
    ("Missed call", "Toothache follow-up", 290.0),
    ("Missed call", "Emergency visit", 320.0),
    ("Website request", "New patient cleaning + exam", 240.0),
    ("Website request", "Whitening inquiry", 450.0),
    ("Referral", "Crown consult", 1180.0),
    ("Referral", "Invisalign interest", 4600.0),
]

_HISTORY_STAGES = (
    ["converted"] * 38
    + ["booked"] * 10
    + ["contacted"] * 8
    + ["new"] * 6
)


def _seed_leads(conn) -> None:
    if conn.execute("SELECT COUNT(*) c FROM leads").fetchone()["c"]:
        return
    for name, phone, source, reason, value, stage in _OPEN_LEADS:
        conn.execute(
            "INSERT INTO leads (id, name, phone, source, reason, est_value, stage) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (_new_id("lead"), name, phone, source, reason, value, stage),
        )
    for i, stage in enumerate(_HISTORY_STAGES):
        first = _HISTORY_FIRST[i % len(_HISTORY_FIRST)]
        last = _HISTORY_LAST[(i * 7) % len(_HISTORY_LAST)]
        source, reason, base_value = _HISTORY_SOURCES[i % len(_HISTORY_SOURCES)]
        value = round(base_value + (i % 5) * 35, 2)
        phone = f"(512) 555-{2000 + i:04d}"
        patient_id = f"hist_pt_{i:03d}" if stage == "converted" else None
        conn.execute(
            "INSERT INTO leads (id, name, phone, source, reason, est_value, stage, patient_id) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (_new_id("lead"), f"{first} {last}", phone, source, reason, value, stage, patient_id),
        )


def _seed_history(conn) -> None:
    if conn.execute("SELECT COUNT(*) c FROM form_submissions").fetchone()["c"]:
        return
    template_ids = [r["id"] for r in conn.execute("SELECT id FROM form_templates").fetchall()]
    if not template_ids:
        template_ids = ["tmpl_intake"]
    total = 280
    now = datetime.now(timezone.utc)
    for i in range(total):
        day_offset = i % 30
        hour = 8 + (i % 9)
        created = (now - timedelta(days=day_offset)).replace(
            hour=hour, minute=(i * 13) % 60, second=0, microsecond=0
        )
        template_id = template_ids[i % len(template_ids)]
        status = "in_chart" if i % 10 != 0 else "completed"
        conn.execute(
            "INSERT INTO form_submissions (id, template_id, patient_id, status, answers, created_at) "
            "VALUES (?, ?, ?, ?, '{}', ?)",
            (_new_id("sub"), template_id, f"hist_pt_{i:03d}", status, created.isoformat()),
        )


def _seed_users(conn) -> None:
    if conn.execute("SELECT COUNT(*) c FROM users").fetchone()["c"]:
        return
    users = [
        ("Dana Whitfield", "dana@brightsmile.co", "Owner", "active", "demo1234"),
        ("Dr. Anil Patel", "apatel@brightsmile.co", "Owner / Admin", "active", "demo1234"),
        ("Maria Santos", "maria@brightsmile.co", "Front Desk", "active", "demo1234"),
        ("Jordan Lee", "jordan@brightsmile.co", "Front Desk", "invited", "demo1234"),
    ]
    for name, email, role, status, password in users:
        conn.execute(
            "INSERT INTO users (id, name, email, role, status, password) VALUES (?, ?, ?, ?, ?, ?)",
            (_new_id("user"), name, email, role, status, password),
        )


def _seed_conversations(conn) -> None:
    if conn.execute("SELECT COUNT(*) c FROM conversations").fetchone()["c"]:
        return
    convos = [
        {
            "id": "conv_marcus", "name": "Marcus Reyes", "channel": "sms", "tag": "Lead",
            "phone": "(512) 555-0182", "last": "Yes tomorrow morning works!", "when": "11:51 AM",
            "messages": [
                ("in", "Hi, my tooth is really hurting. Can I get in soon?", None, "read"),
                ("out", "So sorry to hear that, Marcus. We can see you tomorrow - would 8:30 AM or 10:00 AM be better?", "Dana", "sent"),
                ("in", "Yes tomorrow morning works!", None, "unread"),
            ],
        },
        {
            "id": "conv_grace", "name": "Grace Okafor", "channel": "sms", "tag": "Patient",
            "phone": "(512) 555-0134", "last": "Form completed", "when": "10:20 AM",
            "messages": [
                ("out", "Hi Grace! Please complete your intake form before your visit: [secure link]", "Auto", "sent"),
                ("in", "Done!", None, "read"),
                ("system", "Intake form completed - saved to chart", None, "read"),
            ],
        },
        {
            "id": "conv_tom", "name": "Tom Becker", "channel": "sms", "tag": "Lead",
            "phone": "(512) 555-0119", "last": "What does the crown cost?", "when": "Yesterday",
            "messages": [
                ("out", "Hi Tom, here is the consult form for your crown: [secure link]", "Dana", "sent"),
                ("in", "What does the crown cost?", None, "unread"),
            ],
        },
    ]
    for c in convos:
        conn.execute(
            "INSERT INTO conversations (id, name, channel, tag, phone, last, last_when) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (c["id"], c["name"], c["channel"], c["tag"], c["phone"], c["last"], c["when"]),
        )
        for direction, body, author, status in c["messages"]:
            conn.execute(
                "INSERT INTO messages (id, conversation_id, direction, body, author, channel, status, created_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (_new_id("msg"), c["id"], direction, body, author, c["channel"], status, _now()),
            )


def _seed_audit(conn) -> None:
    if conn.execute("SELECT COUNT(*) c FROM audit_log").fetchone()["c"]:
        return
    entries = [
        ("Dana Whitfield", "Converted lead to patient", "Daniel Cho", "Today 10:31 AM", "Open Dental"),
        ("System", "Form PDF written to chart", "Grace Okafor", "Today 10:20 AM", "Open Dental"),
        ("Maria Santos", "Sent intake form", "Priya Anand", "Today 9:30 AM", "-"),
        ("Dr. Anil Patel", "Viewed ROI report", "Last 30 days", "Yesterday 6:02 PM", "-"),
        ("Dana Whitfield", "Booked appointment", "Grace Okafor - Tomorrow 8:30", "Today 11:58 AM", "Open Dental"),
    ]
    for who, action, target, when, sync in entries:
        conn.execute(
            "INSERT INTO audit_log (id, who, action, target, when_at, sync) VALUES (?, ?, ?, ?, ?, ?)",
            (_new_id("audit"), who, action, target, when, sync),
        )


def create_lead(data: LeadCreate) -> Lead:
    lead_id = _new_id("lead")
    conn = db.connect()
    try:
        conn.execute(
            "INSERT INTO leads (id, name, phone, email, source, reason, est_value, stage) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, 'new')",
            (lead_id, data.name, data.phone, data.email, data.source, data.reason, data.est_value),
        )
        conn.commit()
        return _row_to_lead(conn.execute("SELECT * FROM leads WHERE id = ?", (lead_id,)).fetchone())
    finally:
        conn.close()


def list_leads() -> list[Lead]:
    conn = db.connect()
    try:
        return [_row_to_lead(r) for r in conn.execute("SELECT * FROM leads").fetchall()]
    finally:
        conn.close()


def get_lead(lead_id: str) -> Lead | None:
    conn = db.connect()
    try:
        r = conn.execute("SELECT * FROM leads WHERE id = ?", (lead_id,)).fetchone()
        return _row_to_lead(r) if r else None
    finally:
        conn.close()


def set_lead_converted(lead_id: str, patient_id: str) -> Lead:
    conn = db.connect()
    try:
        conn.execute(
            "UPDATE leads SET stage = 'converted', patient_id = ? WHERE id = ?",
            (patient_id, lead_id),
        )
        conn.commit()
        return _row_to_lead(conn.execute("SELECT * FROM leads WHERE id = ?", (lead_id,)).fetchone())
    finally:
        conn.close()


def list_templates() -> list[FormTemplate]:
    conn = db.connect()
    try:
        return [_row_to_template(r) for r in conn.execute("SELECT * FROM form_templates").fetchall()]
    finally:
        conn.close()


def get_template(template_id: str) -> FormTemplate | None:
    conn = db.connect()
    try:
        r = conn.execute("SELECT * FROM form_templates WHERE id = ?", (template_id,)).fetchone()
        return _row_to_template(r) if r else None
    finally:
        conn.close()


def create_template(name: str, fields: list, category: str | None = None) -> FormTemplate:
    template_id = _new_id("tmpl")
    conn = db.connect()
    try:
        conn.execute(
            "INSERT INTO form_templates (id, name, category, fields) VALUES (?, ?, ?, ?)",
            (template_id, name, category, json.dumps(fields)),
        )
        conn.commit()
        return _row_to_template(conn.execute("SELECT * FROM form_templates WHERE id = ?", (template_id,)).fetchone())
    finally:
        conn.close()


def update_template(template_id: str, name: str | None = None, fields: list | None = None,
                    category: str | None = None) -> FormTemplate | None:
    conn = db.connect()
    try:
        r = conn.execute("SELECT * FROM form_templates WHERE id = ?", (template_id,)).fetchone()
        if not r:
            return None
        new_name = name if name is not None else r["name"]
        new_category = category if category is not None else r["category"]
        new_fields = json.dumps(fields) if fields is not None else r["fields"]
        conn.execute(
            "UPDATE form_templates SET name = ?, category = ?, fields = ? WHERE id = ?",
            (new_name, new_category, new_fields, template_id),
        )
        conn.commit()
        return _row_to_template(conn.execute("SELECT * FROM form_templates WHERE id = ?", (template_id,)).fetchone())
    finally:
        conn.close()


def create_submission(template_id: str, patient_id: str | None = None,
                      lead_id: str | None = None) -> FormSubmission:
    sub_id = _new_id("sub")
    token = secrets.token_urlsafe(16)
    conn = db.connect()
    try:
        conn.execute(
            "INSERT INTO form_submissions (id, template_id, patient_id, lead_id, status, answers, link_token, created_at) "
            "VALUES (?, ?, ?, ?, 'sent', '{}', ?, ?)",
            (sub_id, template_id, patient_id, lead_id, token, _now()),
        )
        conn.commit()
        return _row_to_submission(conn.execute("SELECT * FROM form_submissions WHERE id = ?", (sub_id,)).fetchone())
    finally:
        conn.close()


def get_submission(sub_id: str) -> FormSubmission | None:
    conn = db.connect()
    try:
        r = conn.execute("SELECT * FROM form_submissions WHERE id = ?", (sub_id,)).fetchone()
        return _row_to_submission(r) if r else None
    finally:
        conn.close()


def get_submission_by_token(token: str) -> FormSubmission | None:
    conn = db.connect()
    try:
        r = conn.execute("SELECT * FROM form_submissions WHERE link_token = ?", (token,)).fetchone()
        return _row_to_submission(r) if r else None
    finally:
        conn.close()


def list_submissions() -> list[FormSubmission]:
    conn = db.connect()
    try:
        return [_row_to_submission(r) for r in conn.execute("SELECT * FROM form_submissions").fetchall()]
    finally:
        conn.close()


_REVENUE_PER_NEW_PATIENT = 590.0


def report_metrics(days: int) -> dict:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    conn = db.connect()
    try:
        leads = [_row_to_lead(r) for r in conn.execute("SELECT * FROM leads").fetchall()]
        sub_rows = conn.execute(
            "SELECT status, created_at FROM form_submissions "
            "WHERE status IN ('completed', 'in_chart') "
            "AND (created_at IS NULL OR created_at >= ?)",
            (cutoff,),
        ).fetchall()
        bucket_rows = conn.execute(
            "SELECT created_at FROM form_submissions "
            "WHERE status = 'in_chart' AND created_at IS NOT NULL AND created_at >= ? "
            "ORDER BY created_at ASC",
            (cutoff,),
        ).fetchall()
    finally:
        conn.close()

    converted = [lead for lead in leads if lead.stage == "converted"]
    new_patients = len(converted)
    calls_recovered = sum(1 for lead in leads if lead.source == "Missed call")
    forms_completed = len(sub_rows)
    forms_in_chart = sum(1 for r in sub_rows if r["status"] == "in_chart")

    revenue_by_source: dict[str, float] = {}
    for lead in converted:
        est = lead.est_value if lead.est_value else _REVENUE_PER_NEW_PATIENT
        revenue_by_source[lead.source or "Other"] = revenue_by_source.get(lead.source or "Other", 0.0) + est
    est_revenue = sum(revenue_by_source.values())

    chart = _bucket_chart(bucket_rows, days, fallback=forms_in_chart or new_patients)

    return {
        "new_patients": new_patients,
        "calls_recovered": calls_recovered,
        "forms_completed": forms_completed,
        "forms_in_chart": forms_in_chart,
        "est_revenue": est_revenue,
        "revenue_by_source": revenue_by_source,
        "chart": chart,
    }


def _bucket_chart(rows, days: int, fallback: int) -> list[int]:
    points = 12
    if not rows:
        return [max(1, round(fallback * (0.4 + 0.6 * (i + 1) / points))) for i in range(points)]
    timestamps = []
    for r in rows:
        try:
            timestamps.append(datetime.fromisoformat(r["created_at"]))
        except (TypeError, ValueError):
            continue
    if not timestamps:
        return [max(1, round(fallback * (0.4 + 0.6 * (i + 1) / points))) for i in range(points)]
    end = max(timestamps)
    span = max(days, 1)
    start = end - timedelta(days=span)
    width = (end - start) / points
    counts = [0] * points
    for ts in timestamps:
        if width.total_seconds() <= 0:
            counts[-1] += 1
            continue
        idx = int((ts - start) / width)
        idx = min(max(idx, 0), points - 1)
        counts[idx] += 1
    return [max(1, c) for c in counts]


def update_submission(sub: FormSubmission) -> FormSubmission:
    conn = db.connect()
    try:
        conn.execute(
            "UPDATE form_submissions SET status = ?, answers = ?, document_id = ? WHERE id = ?",
            (sub.status, json.dumps(sub.answers), sub.document_id, sub.id),
        )
        conn.commit()
        return _row_to_submission(conn.execute("SELECT * FROM form_submissions WHERE id = ?", (sub.id,)).fetchone())
    finally:
        conn.close()


def list_submissions_for_patient(patient_id: str) -> list[FormSubmission]:
    conn = db.connect()
    try:
        rows = conn.execute("SELECT * FROM form_submissions WHERE patient_id = ?", (patient_id,)).fetchall()
        return [_row_to_submission(r) for r in rows]
    finally:
        conn.close()


def _messages_for(conn, conversation_id: str) -> list[Message]:
    rows = conn.execute(
        "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC, id ASC",
        (conversation_id,),
    ).fetchall()
    return [_row_to_message(r) for r in rows]


def list_conversations() -> list[Conversation]:
    conn = db.connect()
    try:
        rows = conn.execute("SELECT * FROM conversations").fetchall()
        return [_row_to_conversation(r, _messages_for(conn, r["id"])) for r in rows]
    finally:
        conn.close()


def get_conversation(conversation_id: str) -> Conversation | None:
    conn = db.connect()
    try:
        r = conn.execute("SELECT * FROM conversations WHERE id = ?", (conversation_id,)).fetchone()
        if not r:
            return None
        return _row_to_conversation(r, _messages_for(conn, conversation_id))
    finally:
        conn.close()


def create_conversation(name: str, channel: str = "sms", tag: str | None = None,
                        patient_id: str | None = None, lead_id: str | None = None,
                        phone: str | None = None) -> Conversation:
    conv_id = _new_id("conv")
    conn = db.connect()
    try:
        conn.execute(
            "INSERT INTO conversations (id, name, channel, tag, patient_id, lead_id, phone) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (conv_id, name, channel, tag, patient_id, lead_id, phone),
        )
        conn.commit()
        r = conn.execute("SELECT * FROM conversations WHERE id = ?", (conv_id,)).fetchone()
        return _row_to_conversation(r, [])
    finally:
        conn.close()


def add_message(conversation_id: str, direction: str, body: str, author: str | None = None,
                channel: str = "sms", status: str | None = None) -> Message:
    msg_id = _new_id("msg")
    when = _now()
    conn = db.connect()
    try:
        conn.execute(
            "INSERT INTO messages (id, conversation_id, direction, body, author, channel, status, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (msg_id, conversation_id, direction, body, author, channel, status, when),
        )
        conn.execute(
            "UPDATE conversations SET last = ?, last_when = ? WHERE id = ?",
            (body, when, conversation_id),
        )
        conn.commit()
        return _row_to_message(conn.execute("SELECT * FROM messages WHERE id = ?", (msg_id,)).fetchone())
    finally:
        conn.close()


def messages_for_patient(patient_id: str) -> list[Message]:
    conn = db.connect()
    try:
        rows = conn.execute(
            "SELECT m.* FROM messages m JOIN conversations c ON m.conversation_id = c.id "
            "WHERE c.patient_id = ? ORDER BY m.created_at ASC, m.id ASC",
            (patient_id,),
        ).fetchall()
        return [_row_to_message(r) for r in rows]
    finally:
        conn.close()


def list_users() -> list[User]:
    conn = db.connect()
    try:
        return [_row_to_user(r) for r in conn.execute("SELECT * FROM users").fetchall()]
    finally:
        conn.close()


def get_user(user_id: str) -> User | None:
    conn = db.connect()
    try:
        r = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return _row_to_user(r) if r else None
    finally:
        conn.close()


def get_user_by_email(email: str) -> User | None:
    conn = db.connect()
    try:
        r = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        return _row_to_user(r) if r else None
    finally:
        conn.close()


def verify_credentials(email: str, password: str) -> User | None:
    conn = db.connect()
    try:
        r = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if r and r["password"] == password:
            return _row_to_user(r)
        return None
    finally:
        conn.close()


def create_user(name: str, email: str, role: str, password: str, status: str = "active") -> User:
    user_id = _new_id("user")
    conn = db.connect()
    try:
        conn.execute(
            "INSERT INTO users (id, name, email, role, status, password) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, name, email, role, status, password),
        )
        conn.commit()
        return _row_to_user(conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone())
    finally:
        conn.close()


def store_token(token: str, user_id: str) -> None:
    conn = db.connect()
    try:
        conn.execute("INSERT OR REPLACE INTO auth_tokens (token, user_id) VALUES (?, ?)", (token, user_id))
        conn.commit()
    finally:
        conn.close()


def user_for_token(token: str) -> User | None:
    conn = db.connect()
    try:
        r = conn.execute(
            "SELECT u.* FROM users u JOIN auth_tokens t ON u.id = t.user_id WHERE t.token = ?",
            (token,),
        ).fetchone()
        return _row_to_user(r) if r else None
    finally:
        conn.close()


def append_audit(who: str, action: str, target: str | None = None, when: str | None = None,
                 sync: str | None = None) -> AuditEntry:
    audit_id = _new_id("audit")
    when = when or _now()
    conn = db.connect()
    try:
        conn.execute(
            "INSERT INTO audit_log (id, who, action, target, when_at, sync) VALUES (?, ?, ?, ?, ?, ?)",
            (audit_id, who, action, target, when, sync),
        )
        conn.commit()
        return _row_to_audit(conn.execute("SELECT * FROM audit_log WHERE id = ?", (audit_id,)).fetchone())
    finally:
        conn.close()


def list_audit() -> list[AuditEntry]:
    conn = db.connect()
    try:
        return [_row_to_audit(r) for r in conn.execute("SELECT * FROM audit_log ORDER BY id DESC").fetchall()]
    finally:
        conn.close()


_DEFAULT_ACCOUNT_ID = "acct_demo"


def _row_to_account(r) -> Account:
    return Account(
        id=r["id"], name=r["name"], plan=r["plan"], location_count=r["location_count"],
        stripe_customer_id=r["stripe_customer_id"], status=r["status"],
    )


def _row_to_waitlist(r) -> WaitlistEntry:
    return WaitlistEntry(
        id=r["id"], account_id=r["account_id"], name=r["name"], phone=r["phone"],
        reason=r["reason"], status=r["status"], created_at=r["created_at"],
        notified_at=r["notified_at"],
    )


def _row_to_review(r) -> ReviewRequest:
    return ReviewRequest(
        id=r["id"], account_id=r["account_id"], name=r["name"], phone=r["phone"],
        patient_id=r["patient_id"], status=r["status"], created_at=r["created_at"],
    )


def _ensure_users_account_id(conn) -> None:
    columns = {r["name"] for r in conn.execute("PRAGMA table_info(users)").fetchall()}
    if "account_id" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN account_id TEXT")


def _seed_account(conn) -> None:
    if conn.execute("SELECT COUNT(*) c FROM accounts").fetchone()["c"]:
        return
    conn.execute(
        "INSERT INTO accounts (id, name, plan, location_count, status) VALUES (?, ?, 'core', 1, 'active')",
        (_DEFAULT_ACCOUNT_ID, settings.practice_name),
    )
    conn.execute("UPDATE users SET account_id = ? WHERE account_id IS NULL", (_DEFAULT_ACCOUNT_ID,))


def _seed_waitlist(conn) -> None:
    if conn.execute("SELECT COUNT(*) c FROM waitlist_entries").fetchone()["c"]:
        return
    entries = [
        ("Hannah Brooks", "(512) 555-0211", "Cleaning, flexible mornings"),
        ("Diego Ramirez", "(512) 555-0233", "Crown follow-up"),
        ("Aisha Khan", "(512) 555-0247", "New patient exam"),
        ("Brandon Cole", "(512) 555-0259", "Whitening consult"),
    ]
    for name, phone, reason in entries:
        conn.execute(
            "INSERT INTO waitlist_entries (id, account_id, name, phone, reason, status, created_at) "
            "VALUES (?, ?, ?, ?, ?, 'active', ?)",
            (_new_id("wl"), _DEFAULT_ACCOUNT_ID, name, phone, reason, _now()),
        )


def _seed_reviews(conn) -> None:
    if conn.execute("SELECT COUNT(*) c FROM review_requests").fetchone()["c"]:
        return
    reqs = [
        ("Grace Okafor", "(512) 555-0134", "recorded"),
        ("Kevin Liu", "(512) 555-0155", "recorded"),
        ("Sofia Martens", "(512) 555-0167", "recorded"),
    ]
    for name, phone, status in reqs:
        conn.execute(
            "INSERT INTO review_requests (id, account_id, name, phone, status, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (_new_id("rev"), _DEFAULT_ACCOUNT_ID, name, phone, status, _now()),
        )


def get_default_account() -> Account | None:
    return get_account(_DEFAULT_ACCOUNT_ID)


def get_account(account_id: str) -> Account | None:
    conn = db.connect()
    try:
        r = conn.execute("SELECT * FROM accounts WHERE id = ?", (account_id,)).fetchone()
        return _row_to_account(r) if r else None
    finally:
        conn.close()


def account_for_user(user_id: str) -> Account | None:
    conn = db.connect()
    try:
        r = conn.execute("SELECT account_id FROM users WHERE id = ?", (user_id,)).fetchone()
        account_id = r["account_id"] if r and r["account_id"] else _DEFAULT_ACCOUNT_ID
    finally:
        conn.close()
    return get_account(account_id)


def set_plan(account_id: str, plan: str) -> Account | None:
    conn = db.connect()
    try:
        conn.execute("UPDATE accounts SET plan = ? WHERE id = ?", (plan, account_id))
        conn.commit()
    finally:
        conn.close()
    return get_account(account_id)


def find_account_by_stripe_customer(customer_id: str) -> Account | None:
    conn = db.connect()
    try:
        r = conn.execute("SELECT * FROM accounts WHERE stripe_customer_id = ?", (customer_id,)).fetchone()
        return _row_to_account(r) if r else None
    finally:
        conn.close()


def current_period() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


def record_usage(account_id: str, meter: str, qty: float, location_id: str = "loc_1") -> None:
    period = current_period()
    conn = db.connect()
    try:
        conn.execute(
            "INSERT INTO usage_events (id, account_id, location_id, meter, qty, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (_new_id("use"), account_id, location_id, meter, qty, _now()),
        )
        conn.execute(
            "INSERT INTO usage_counters (account_id, location_id, meter, period, used) "
            "VALUES (?, ?, ?, ?, ?) "
            "ON CONFLICT(account_id, location_id, meter, period) "
            "DO UPDATE SET used = used + excluded.used",
            (account_id, location_id, meter, period, qty),
        )
        conn.commit()
    finally:
        conn.close()


def usage_for(account_id: str, period: str) -> dict:
    conn = db.connect()
    try:
        rows = conn.execute(
            "SELECT meter, SUM(used) total FROM usage_counters "
            "WHERE account_id = ? AND period = ? GROUP BY meter",
            (account_id, period),
        ).fetchall()
        return {r["meter"]: r["total"] or 0 for r in rows}
    finally:
        conn.close()


def list_waitlist(account_id: str) -> list[WaitlistEntry]:
    conn = db.connect()
    try:
        rows = conn.execute(
            "SELECT * FROM waitlist_entries WHERE account_id = ? ORDER BY created_at ASC, id ASC",
            (account_id,),
        ).fetchall()
        return [_row_to_waitlist(r) for r in rows]
    finally:
        conn.close()


def add_waitlist(account_id: str, name: str, phone: str | None = None,
                 reason: str | None = None) -> WaitlistEntry:
    entry_id = _new_id("wl")
    conn = db.connect()
    try:
        conn.execute(
            "INSERT INTO waitlist_entries (id, account_id, name, phone, reason, status, created_at) "
            "VALUES (?, ?, ?, ?, ?, 'active', ?)",
            (entry_id, account_id, name, phone, reason, _now()),
        )
        conn.commit()
        return _row_to_waitlist(conn.execute("SELECT * FROM waitlist_entries WHERE id = ?", (entry_id,)).fetchone())
    finally:
        conn.close()


def remove_waitlist(account_id: str, entry_id: str) -> None:
    conn = db.connect()
    try:
        conn.execute("DELETE FROM waitlist_entries WHERE id = ? AND account_id = ?", (entry_id, account_id))
        conn.commit()
    finally:
        conn.close()


def mark_waitlist_notified(account_id: str, entry_ids: list[str]) -> None:
    if not entry_ids:
        return
    when = _now()
    conn = db.connect()
    try:
        for entry_id in entry_ids:
            conn.execute(
                "UPDATE waitlist_entries SET status = 'notified', notified_at = ? WHERE id = ? AND account_id = ?",
                (when, entry_id, account_id),
            )
        conn.commit()
    finally:
        conn.close()


def list_review_requests(account_id: str) -> list[ReviewRequest]:
    conn = db.connect()
    try:
        rows = conn.execute(
            "SELECT * FROM review_requests WHERE account_id = ? ORDER BY created_at DESC, id DESC",
            (account_id,),
        ).fetchall()
        return [_row_to_review(r) for r in rows]
    finally:
        conn.close()


def add_review_request(account_id: str, name: str, phone: str | None = None,
                       patient_id: str | None = None, status: str = "sent") -> ReviewRequest:
    req_id = _new_id("rev")
    conn = db.connect()
    try:
        conn.execute(
            "INSERT INTO review_requests (id, account_id, name, phone, patient_id, status, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (req_id, account_id, name, phone, patient_id, status, _now()),
        )
        conn.commit()
        return _row_to_review(conn.execute("SELECT * FROM review_requests WHERE id = ?", (req_id,)).fetchone())
    finally:
        conn.close()


def processed_stripe_event(event_id: str) -> bool:
    conn = db.connect()
    try:
        existing = conn.execute("SELECT 1 FROM stripe_events WHERE id = ?", (event_id,)).fetchone()
        if existing:
            return True
        conn.execute("INSERT INTO stripe_events (id, created_at) VALUES (?, ?)", (event_id, _now()))
        conn.commit()
        return False
    finally:
        conn.close()
