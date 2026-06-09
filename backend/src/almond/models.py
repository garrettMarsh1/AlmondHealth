from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel


class Provider(BaseModel):
    id: str
    abbr: str | None = None
    name: str | None = None


class Operatory(BaseModel):
    id: str
    name: str | None = None


class Patient(BaseModel):
    id: str | None = None
    first: str
    last: str
    dob: date | None = None
    gender: str | None = None
    phone: str | None = None
    email: str | None = None


class PatientCreate(BaseModel):
    first: str
    last: str
    dob: date | None = None
    gender: str | None = None
    phone: str | None = None
    email: str | None = None


class Slot(BaseModel):
    start: datetime
    end: datetime | None = None
    provider_id: str | None = None
    operatory_id: str | None = None


class Appointment(BaseModel):
    id: str | None = None
    patient_id: str
    start: datetime
    operatory_id: str | None = None
    provider_id: str | None = None
    status: str | None = None
    reason: str | None = None


class AppointmentCreate(BaseModel):
    patient_id: str
    start: datetime
    operatory_id: str
    provider_id: str | None = None
    reason: str | None = None


class Document(BaseModel):
    id: str | None = None
    patient_id: str
    description: str | None = None
    created_at: datetime | None = None
    type: str | None = None


class Lead(BaseModel):
    id: str
    name: str
    phone: str | None = None
    email: str | None = None
    source: str | None = None
    reason: str | None = None
    est_value: float | None = None
    stage: str = "new"
    patient_id: str | None = None


class LeadCreate(BaseModel):
    name: str
    phone: str | None = None
    email: str | None = None
    source: str | None = None
    reason: str | None = None
    est_value: float | None = None


class FormField(BaseModel):
    type: str
    label: str
    required: bool = False
    options: list[str] = []


class FormTemplate(BaseModel):
    id: str
    name: str
    fields: list = []
    category: str | None = None


class FormTemplateCreate(BaseModel):
    name: str
    fields: list[FormField] = []
    category: str | None = None


class FormSubmission(BaseModel):
    id: str
    template_id: str
    patient_id: str | None = None
    lead_id: str | None = None
    status: str = "sent"
    answers: dict = {}
    document_id: str | None = None
    link_token: str | None = None


class Message(BaseModel):
    id: str
    conversation_id: str
    direction: str
    body: str
    author: str | None = None
    channel: str = "sms"
    status: str | None = None
    created_at: datetime | None = None


class MessageCreate(BaseModel):
    text: str


class Conversation(BaseModel):
    id: str
    name: str
    channel: str = "sms"
    tag: str | None = None
    patient_id: str | None = None
    lead_id: str | None = None
    phone: str | None = None
    unread: int = 0
    last: str | None = None
    when: str | None = None
    messages: list[Message] = []


class User(BaseModel):
    id: str
    name: str
    email: str
    role: str
    status: str = "active"


class UserCreate(BaseModel):
    name: str
    email: str
    role: str
    password: str
    status: str = "active"


class AuditEntry(BaseModel):
    id: str
    who: str
    action: str
    target: str | None = None
    when: str | None = None
    sync: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


class Account(BaseModel):
    id: str
    name: str
    plan: str = "core"
    location_count: int = 1
    stripe_customer_id: str | None = None
    status: str = "active"


class Subscription(BaseModel):
    id: str
    account_id: str
    stripe_subscription_id: str | None = None
    plan: str
    status: str = "active"
    period_start: str | None = None
    period_end: str | None = None


class UsageEvent(BaseModel):
    id: str
    account_id: str
    location_id: str = "loc_1"
    meter: str
    qty: float = 0.0
    created_at: str | None = None


class WaitlistEntry(BaseModel):
    id: str
    account_id: str
    name: str
    phone: str | None = None
    reason: str | None = None
    status: str = "active"
    created_at: str | None = None
    notified_at: str | None = None


class ReviewRequest(BaseModel):
    id: str
    account_id: str
    name: str
    phone: str | None = None
    patient_id: str | None = None
    status: str = "sent"
    created_at: str | None = None
