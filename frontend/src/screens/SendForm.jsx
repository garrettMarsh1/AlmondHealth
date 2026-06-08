import { useState, useEffect } from "react";
import { Button, Badge, SyncPill } from "../ui";
import { api } from "../api";

const STATUS_TONE = { sent: "neutral", opened: "warn", completed: "ok", in_chart: "ok" };
const STATUS_LABEL = { sent: "Sent", opened: "Opened", completed: "Completed", in_chart: "In chart" };

export default function SendForm() {
  const [templates, setTemplates] = useState([]);
  const [patients, setPatients] = useState([]);
  const [recent, setRecent] = useState([]);
  const [tpl, setTpl] = useState("");
  const [recipient, setRecipient] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api.submissions().then(setRecent).catch(() => {});
  useEffect(() => {
    api.formTemplates().then((t) => { setTemplates(t); setTpl(t[0]?.id || ""); }).catch(() => {});
    api.patients({ last: "" }).then((p) => setPatients((p || []).slice(0, 10))).catch(() => {});
    load();
  }, []);

  const send = async () => {
    if (!tpl || !recipient) return;
    setBusy(true);
    try { await api.sendForm(tpl, { patient_id: recipient }); load(); } finally { setBusy(false); }
  };

  const simulate = async (sub) => {
    if (!sub.link_token) return;
    await api.submitForm(sub.link_token, {
      "Full name": "Demo Patient", "Chief complaint": "cleaning + exam", "Consent to treat": "signed 2026-06-08",
    });
    load();
  };

  const tplName = (id) => templates.find((t) => t.id === id)?.name || id;

  return (
    <div className="content"><div className="content-wide">
      <div className="page-head"><h1>Send a form</h1><div className="ph-sub">Text a secure link. The patient fills it on their phone — no app, no login. It comes back as a chart PDF. <strong>Live to Open Dental.</strong></div></div>

      <div className="grid-dash">
        <div className="card card-pad">
          <div className="card-title" style={{ marginBottom: 16 }}>Choose form &amp; patient</div>
          <div className="field">
            <label className="label">Form</label>
            <select className="input" value={tpl} onChange={(e) => setTpl(e.target.value)}>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label className="label">Patient (live from Open Dental)</label>
            <select className="input" value={recipient} onChange={(e) => setRecipient(e.target.value)}>
              <option value="">Select a patient…</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.first} {p.last} · #{p.id}</option>)}
            </select>
          </div>
          <Button variant="primary" icon="send" loading={busy} style={{ marginTop: 18 }} onClick={send} disabled={!recipient}>Send secure form link</Button>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 12, lineHeight: 1.5 }}>The patient gets a texted link → completes on their phone → a PDF is written straight into their Open Dental chart.</div>
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title">Recent sends</div><SyncPill state="saved" target="Open Dental" time="live" /></div>
          <div>
            {recent.length === 0 && <div className="lrow"><div className="lr-main"><div className="lr-sub">No forms sent yet — send one to watch the Sent → Completed → In chart flow.</div></div></div>}
            {recent.slice().reverse().map((s) => (
              <div className="lrow" key={s.id}>
                <div className="lr-main">
                  <div className="lr-title">Patient #{s.patient_id || "—"}</div>
                  <div className="lr-sub">{tplName(s.template_id)}{s.document_id ? ` · chart DocNum ${s.document_id}` : ""}</div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <Badge tone={STATUS_TONE[s.status] || "neutral"} icon={s.status === "in_chart" ? "check" : undefined}>{STATUS_LABEL[s.status] || s.status}</Badge>
                  {s.status === "sent" && <Button variant="ghost" size="sm" onClick={() => simulate(s)}>Simulate complete</Button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div></div>
  );
}
