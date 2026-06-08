from __future__ import annotations

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent.parent / "practicebridge.db"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    source TEXT,
    reason TEXT,
    est_value REAL,
    stage TEXT NOT NULL DEFAULT 'new',
    patient_id TEXT
);

CREATE TABLE IF NOT EXISTS form_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    fields TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS form_submissions (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    patient_id TEXT,
    lead_id TEXT,
    status TEXT NOT NULL DEFAULT 'sent',
    answers TEXT NOT NULL DEFAULT '{}',
    document_id TEXT,
    link_token TEXT
);

CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'sms',
    tag TEXT,
    patient_id TEXT,
    lead_id TEXT,
    phone TEXT,
    last TEXT,
    last_when TEXT
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    direction TEXT NOT NULL,
    body TEXT NOT NULL,
    author TEXT,
    channel TEXT NOT NULL DEFAULT 'sms',
    status TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    who TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT,
    when_at TEXT,
    sync TEXT
);

CREATE TABLE IF NOT EXISTS auth_tokens (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL
);
"""


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init() -> None:
    conn = connect()
    try:
        conn.executescript(_SCHEMA)
        conn.commit()
    finally:
        conn.close()
