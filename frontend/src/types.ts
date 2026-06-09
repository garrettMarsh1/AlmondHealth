export interface Provider {
  id: string;
  abbr?: string | null;
  name?: string | null;
}

export interface Operatory {
  id: string;
  name?: string | null;
}

export interface Patient {
  id?: string | null;
  first: string;
  last: string;
  dob?: string | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface PatientCreate {
  first: string;
  last: string;
  dob?: string | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface Slot {
  start: string;
  end?: string | null;
  provider_id?: string | null;
  operatory_id?: string | null;
}

export interface Appointment {
  id?: string | null;
  patient_id: string;
  start: string;
  operatory_id?: string | null;
  provider_id?: string | null;
  status?: string | null;
  reason?: string | null;
  patient_name?: string | null;
}

export interface AppointmentCreate {
  patient_id: string;
  start: string;
  operatory_id: string;
  provider_id?: string | null;
  reason?: string | null;
}

export type LeadStage = "new" | "contacted" | "booked" | "converted";

export interface Lead {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  source?: string | null;
  reason?: string | null;
  est_value?: number | null;
  stage: LeadStage;
  patient_id?: string | null;
}

export interface LeadCreate {
  name: string;
  phone?: string | null;
  email?: string | null;
  source?: string | null;
  reason?: string | null;
  est_value?: number | null;
}

export interface LeadConvertResult {
  patient: Patient;
  appointment: Appointment | null;
  lead: Lead;
}

export type FormFieldType =
  | "section"
  | "text"
  | "choice"
  | "date"
  | "yesno"
  | "signature";

export interface FormField {
  type: FormFieldType;
  label: string;
  required?: boolean;
  options?: string[];
}

export interface FormTemplate {
  id: string;
  name: string;
  category?: string | null;
  fields: Array<FormField | string>;
}

export interface FormTemplateCreate {
  name: string;
  fields: FormField[];
  category?: string | null;
}

export interface FormTemplatePatch {
  name?: string;
  fields?: FormField[];
  category?: string;
}

export type FormSubmissionStatus = "sent" | "completed" | "in_chart";

export interface FormSubmission {
  id: string;
  template_id: string;
  patient_id?: string | null;
  lead_id?: string | null;
  status: FormSubmissionStatus;
  answers: Record<string, unknown>;
  document_id?: string | null;
  link_token?: string | null;
}

export interface FormSubmissionResult {
  submission: FormSubmission;
  link: string;
}

export type MessageDirection = "in" | "out" | "system";
export type Channel = "sms" | "email";

export interface Message {
  id: string;
  conversation_id: string;
  direction: MessageDirection;
  body: string;
  author?: string | null;
  channel: Channel;
  status?: string | null;
  created_at?: string | null;
}

export interface Conversation {
  id: string;
  name: string;
  channel: Channel;
  tag?: string | null;
  patient_id?: string | null;
  lead_id?: string | null;
  phone?: string | null;
  unread: number;
  last?: string | null;
  when?: string | null;
  messages: Message[];
}

export interface MessageDelivery {
  ok: boolean;
  status: string;
  provider: string;
}

export interface SendMessageResult {
  message: Message;
  delivery: MessageDelivery;
}

export type UserStatus = "active" | "invited";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: UserStatus;
}

export interface LoginResult {
  token: string;
  user: User;
}

export interface AuditEntry {
  id: string;
  who: string;
  action: string;
  target?: string | null;
  when?: string | null;
  sync?: string | null;
}

export interface ReportKpi {
  label: string;
  value: number | string;
  delta: string;
  good: boolean;
  icon: string;
  note: string;
}

export interface ReportsOverview {
  range: string;
  kpis: ReportKpi[];
  time_saved: string;
  chart: number[];
  revenue_breakdown?: Array<{ label: string; value: number | string }>;
}

export type ConnectorStatus = "connected" | "available";

export interface Connector {
  name: string;
  kind: string;
  status: ConnectorStatus;
  detail: string;
  writes: boolean;
}

export interface Health {
  ok: boolean;
  pms: string;
}

export type TimelineEventType = "appt" | "form" | "msg" | "lead";

export interface TimelineEvent {
  type: TimelineEventType;
  icon: string;
  title: string;
  detail: string;
  when: string;
  sync?: string | null;
}

export interface PatientTimeline {
  patient: Patient;
  events: TimelineEvent[];
}

export interface PublicFormPayload {
  practice: { name: string; location: string; phone: string };
  form: { name: string; fields: Array<FormField | string> };
  status: FormSubmissionStatus;
}

export interface PublicFormSubmitResult {
  status: "completed" | "in_chart";
  document_id: string | null;
}
