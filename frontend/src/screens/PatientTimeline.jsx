import { useState, useEffect } from "react";
import { Button, Badge, SyncPill, Avatar, SkelRows, EmptyState, ErrorState, Icon } from "../ui";
import { useNav } from "../ctx";
import { api } from "../api";

const ICON_TONE = { appt: "pine", form: "pine", msg: "", send: "", lead: "apricot" };

const STATUS_META = {
  in_chart: { label: "Saved to chart", tone: "pine" },
  completed: { label: "Completed", tone: "blue" },
  sent: { label: "Sent", tone: "neutral" },
  pending: { label: "Pending", tone: "amber" },
  failed: { label: "Failed", tone: "rose" },
  delivered: { label: "Delivered", tone: "neutral" },
  received: { label: "Received", tone: "neutral" },
  read: { label: "Read", tone: "neutral" },
  queued: { label: "Queued", tone: "neutral" },
};

const isRawStatus = (token) => /^[a-z]+(?:_[a-z]+)+$/.test(token) || token in STATUS_META;

const humanize = (token) => token.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const splitTitleStatus = (title) => {
  if (!title) return { title: "", status: null };
  const trimmed = title.trim();
  if (trimmed.endsWith('"')) return { title: trimmed, status: null };
  const parts = trimmed.split(" ");
  const last = parts[parts.length - 1];
  if (parts.length > 1 && isRawStatus(last)) {
    return { title: parts.slice(0, -1).join(" "), status: last };
  }
  return { title: trimmed, status: null };
};

const fullName = (p) => (p ? [p.first, p.last].filter(Boolean).join(" ") : "");

function TimelineFeed({ status, events, onRetry }) {
  if (status === "loading") return <div className="card card-pad"><SkelRows n={5} avatar={false} /></div>;
  if (status === "error") return <ErrorState title="Couldn’t load this patient" onRetry={onRetry} />;
  if (!events.length)
    return <EmptyState icon="timeline" title="No activity yet" desc="This patient’s appointments, forms, and messages will appear here." />;
  return (
    <div className="card card-pad">
      <div className="tl">
        {events.map((t, i) => {
          const { title, status } = splitTitleStatus(t.title);
          const meta = status ? STATUS_META[status] || { label: humanize(status), tone: "neutral" } : null;
          const showStatusBadge = meta && status !== "in_chart";
          return (
          <div className="tl-item" key={i}>
            <span className={`tl-ic ${ICON_TONE[t.type] || ""}`}><Icon name={t.icon} size={17} /></span>
            <div className="tl-card">
              <div className="between">
                <div className="tl-title">{title}</div>
                <div className="row" style={{ gap: 6 }}>
                  {showStatusBadge && <Badge tone={meta.tone}>{meta.label}</Badge>}
                  {t.by && <Badge tone="neutral">{t.by}</Badge>}
                </div>
              </div>
              <div className="tl-detail">{t.detail}</div>
              <div className="row" style={{ gap: 10, marginTop: 6 }}>
                <span className="tl-when">{t.when}</span>
                {t.sync === "saved" && <span className="sync sync-saved" style={{ fontSize: 10.5, padding: "3px 8px" }}><Icon name="check" className="ic" />Saved to chart</span>}
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PatientTimeline() {
  const { navigate, params } = useNav();
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(params.patientId || "");
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    api.patients({ last: "" }).then((p) => {
      const list = p || [];
      setPatients(list);
      if (!selected && list[0]) setSelected(list[0].id);
    }).catch(() => {});
  }, []);

  const load = (id) => {
    if (!id) return;
    setStatus("loading");
    api.patientTimeline(id)
      .then((res) => { setData(res); setStatus("done"); })
      .catch(() => setStatus("error"));
  };

  useEffect(() => { load(selected); }, [selected]);

  const patient = data?.patient;
  const events = data?.events || [];
  const name = fullName(patient) || patients.find((p) => p.id === selected) && fullName(patients.find((p) => p.id === selected)) || "Patient";

  return (
    <div className="content">
      <div className="content-wide">
        <div className="page-head page-head-row">
          <div>
            <Button variant="ghost" icon="chevL" onClick={() => navigate("today")} style={{ marginBottom: 10 }}>Back</Button>
            <h1>Patient timeline</h1>
            <div className="ph-sub">Every appointment, form, and message for one patient — merged in order. <strong>Live from Open Dental.</strong></div>
          </div>
          <div className="field" style={{ minWidth: 240 }}>
            <label className="label">Patient (live from Open Dental)</label>
            <select className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">Select a patient…</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{fullName(p)} · #{p.id}</option>)}
            </select>
          </div>
        </div>

        {!selected ? (
          <EmptyState icon="timeline" title="Choose a patient" desc="Pick a patient above to see their full activity timeline." />
        ) : (
          <div className="grid-dash">
            <div>
              <div className="between" style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800 }}>Activity</h2>
                <SyncPill state="saved" target="Open Dental" time="live" />
              </div>
              <TimelineFeed status={status} events={events} onRetry={() => load(selected)} />
            </div>

            <div className="stack">
              <div className="card card-pad" style={{ textAlign: "center" }}>
                <Avatar name={name} size="lg" color="var(--p-500)" />
                <div style={{ margin: "0 auto", marginTop: 0 }} />
                <div style={{ fontSize: 19, fontWeight: 800, marginTop: 12 }}>{name}</div>
                <div className="muted" style={{ fontSize: 13 }}>Patient · {patient?.id || selected}</div>
                <div className="row" style={{ gap: 8, justifyContent: "center", marginTop: 14 }}>
                  <Button variant="primary" size="sm" icon="message" onClick={() => navigate("messages")}>Message</Button>
                  <Button variant="secondary" size="sm" icon="send" onClick={() => navigate("sendform")}>Send form</Button>
                </div>
              </div>
              <div className="card">
                <div className="card-head"><div className="card-title" style={{ fontSize: 15 }}>Details</div></div>
                <div>
                  {[["Date of birth", patient?.dob], ["Mobile", patient?.phone], ["Email", patient?.email], ["Record system", "Open Dental"]].map(([k, v]) => (
                    <div className="between" key={k} style={{ padding: "12px 18px", borderBottom: "1px solid var(--line)" }}>
                      <span className="muted" style={{ fontSize: 13 }}>{k}</span>
                      <span style={{ fontWeight: 600, fontSize: 13.5 }}>{v || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
