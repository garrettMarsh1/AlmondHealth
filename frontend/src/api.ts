import type {
  Health,
  Provider,
  Operatory,
  Patient,
  Appointment,
  AppointmentCreate,
  Slot,
  Lead,
  LeadCreate,
  LeadConvertResult,
  ReportsOverview,
  FormTemplate,
  FormTemplateCreate,
  FormTemplatePatch,
  FormSubmission,
  FormSubmissionResult,
  PatientTimeline,
  Conversation,
  SendMessageResult,
  Connector,
  User,
  AuditEntry,
  LoginResult,
  PublicFormPayload,
  PublicFormSubmitResult,
} from "./types";

const TOKEN_KEY = "pb_token";

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function j<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json() as Promise<T>;
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
}

interface ReqOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

function req<T>(path: string, { method = "GET", body, headers }: ReqOptions = {}): Promise<T> {
  const opts: RequestInit = { method, headers: authHeaders(headers) };
  if (body !== undefined) {
    opts.headers = { ...(opts.headers as Record<string, string>), "Content-Type": "application/json" };
    opts.body = JSON.stringify(body);
  }
  return fetch(path, opts).then((r) => j<T>(r));
}

const qs = (o: Record<string, unknown>): string =>
  new URLSearchParams(
    Object.entries(o)
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, String(v)]),
  ).toString();

export const api = {
  health: (): Promise<Health> => req("/v1/health"),
  providers: (): Promise<Provider[]> => req("/v1/providers"),
  operatories: (): Promise<Operatory[]> => req("/v1/operatories"),
  patients: (params: Record<string, unknown> = {}): Promise<Patient[]> =>
    req(`/v1/patients?${qs(params)}`),
  appointments: (dateStart: string, dateEnd: string): Promise<Appointment[]> =>
    req(`/v1/appointments?${qs({ date_start: dateStart, date_end: dateEnd })}`),
  appointmentsRange: (dateStart: string, dateEnd: string): Promise<Appointment[]> =>
    req(`/v1/appointments?${qs({ date_start: dateStart, date_end: dateEnd })}`),
  availability: (dateStart: string, dateEnd: string, minutes?: number): Promise<Slot[]> =>
    req(`/v1/availability?${qs({ date_start: dateStart, date_end: dateEnd, minutes })}`),
  bookAppointment: (appt: AppointmentCreate): Promise<Appointment> =>
    req("/v1/appointments", { method: "POST", body: appt }),
  leads: (): Promise<Lead[]> => req("/v1/leads"),
  createLead: (lead: LeadCreate): Promise<Lead> =>
    req("/v1/leads", { method: "POST", body: lead }),
  convertLead: (id: string, opts: Record<string, unknown> = {}): Promise<LeadConvertResult> =>
    req(`/v1/leads/${id}/convert?${qs(opts)}`, { method: "POST" }),
  reportsOverview: (range?: string): Promise<ReportsOverview> =>
    req(`/v1/reports/overview?${qs({ range })}`),
  formTemplates: (): Promise<FormTemplate[]> => req("/v1/forms/templates"),
  formTemplate: (id: string): Promise<FormTemplate> => req(`/v1/forms/templates/${id}`),
  createTemplate: (template: FormTemplateCreate): Promise<FormTemplate> =>
    req("/v1/forms/templates", { method: "POST", body: template }),
  updateTemplate: (id: string, patch: FormTemplatePatch): Promise<FormTemplate> =>
    req(`/v1/forms/templates/${id}`, { method: "PUT", body: patch }),
  submissions: (): Promise<FormSubmission[]> => req("/v1/forms/submissions"),
  sendForm: (templateId: string, opts: Record<string, unknown> = {}): Promise<FormSubmissionResult> =>
    req(`/v1/forms/send?${qs({ template_id: templateId, ...opts })}`, { method: "POST" }),
  submitForm: (token: string, answers: Record<string, unknown>): Promise<FormSubmission> =>
    req(`/v1/forms/submit/${token}`, { method: "POST", body: answers }),
  patientTimeline: (id: string): Promise<PatientTimeline> =>
    req(`/v1/patients/${id}/timeline`),
  conversations: (): Promise<Conversation[]> => req("/v1/conversations"),
  conversation: (id: string): Promise<Conversation> => req(`/v1/conversations/${id}`),
  sendMessage: (id: string, text: string): Promise<SendMessageResult> =>
    req(`/v1/conversations/${id}/messages`, { method: "POST", body: { text } }),
  settingsConnectors: (): Promise<Connector[]> => req("/v1/settings/connectors"),
  settingsUsers: (): Promise<User[]> => req("/v1/settings/users"),
  settingsAudit: (): Promise<AuditEntry[]> => req("/v1/settings/audit"),
  login: (email: string, password: string): Promise<LoginResult> =>
    req("/v1/auth/login", { method: "POST", body: { email, password } }),
  publicForm: (token: string): Promise<PublicFormPayload> => req(`/v1/p/forms/${token}`),
  submitPublicForm: (token: string, answers: Record<string, unknown>): Promise<PublicFormSubmitResult> =>
    req(`/v1/p/forms/${token}`, { method: "POST", body: answers }),
};
