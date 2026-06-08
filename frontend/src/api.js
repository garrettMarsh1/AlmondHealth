const TOKEN_KEY = "pb_token";

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function j(r) {
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

function authHeaders(extra = {}) {
  const token = getToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
}

function req(path, { method = "GET", body, headers } = {}) {
  const opts = { method, headers: authHeaders(headers) };
  if (body !== undefined) {
    opts.headers = { ...opts.headers, "Content-Type": "application/json" };
    opts.body = JSON.stringify(body);
  }
  return fetch(path, opts).then(j);
}

const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v != null)).toString();

export const api = {
  health: () => req("/v1/health"),
  providers: () => req("/v1/providers"),
  operatories: () => req("/v1/operatories"),
  patients: (params = {}) => req(`/v1/patients?${qs(params)}`),
  appointments: (dateStart, dateEnd) =>
    req(`/v1/appointments?${qs({ date_start: dateStart, date_end: dateEnd })}`),
  appointmentsRange: (dateStart, dateEnd) =>
    req(`/v1/appointments?${qs({ date_start: dateStart, date_end: dateEnd })}`),
  availability: (dateStart, dateEnd, minutes) =>
    req(`/v1/availability?${qs({ date_start: dateStart, date_end: dateEnd, minutes })}`),
  bookAppointment: (appt) => req("/v1/appointments", { method: "POST", body: appt }),
  leads: () => req("/v1/leads"),
  createLead: (lead) => req("/v1/leads", { method: "POST", body: lead }),
  convertLead: (id, opts = {}) =>
    req(`/v1/leads/${id}/convert?${qs(opts)}`, { method: "POST" }),
  reportsOverview: (range) => req(`/v1/reports/overview?${qs({ range })}`),
  formTemplates: () => req("/v1/forms/templates"),
  formTemplate: (id) => req(`/v1/forms/templates/${id}`),
  createTemplate: (template) => req("/v1/forms/templates", { method: "POST", body: template }),
  updateTemplate: (id, patch) => req(`/v1/forms/templates/${id}`, { method: "PUT", body: patch }),
  submissions: () => req("/v1/forms/submissions"),
  sendForm: (templateId, opts = {}) =>
    req(`/v1/forms/send?${qs({ template_id: templateId, ...opts })}`, { method: "POST" }),
  submitForm: (token, answers) =>
    req(`/v1/forms/submit/${token}`, { method: "POST", body: answers }),
  patientTimeline: (id) => req(`/v1/patients/${id}/timeline`),
  conversations: () => req("/v1/conversations"),
  conversation: (id) => req(`/v1/conversations/${id}`),
  sendMessage: (id, text) =>
    req(`/v1/conversations/${id}/messages`, { method: "POST", body: { text } }),
  settingsConnectors: () => req("/v1/settings/connectors"),
  settingsUsers: () => req("/v1/settings/users"),
  settingsAudit: () => req("/v1/settings/audit"),
  login: (email, password) => req("/v1/auth/login", { method: "POST", body: { email, password } }),
  publicForm: (token) => req(`/v1/p/forms/${token}`),
  submitPublicForm: (token, answers) =>
    req(`/v1/p/forms/${token}`, { method: "POST", body: answers }),
};
