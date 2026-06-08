import { useState, useEffect } from "react";
import { Icon, Button, Badge, SyncPill, Checkbox, Avatar, SkelRows, ErrorState } from "../ui";
import { useNav } from "../ctx";
import { api } from "../api";

const STEPS = ["Connect PMS", "Messaging", "Form templates", "Invite staff"];
const DEFAULT_PMS = [
  { name: "Open Dental", kind: "PMS", status: "available", detail: "Recommended — quickest to connect" },
  { name: "Denticon", kind: "PMS", status: "available", detail: "Cloud API" },
  { name: "NextGen", kind: "EHR", status: "available", detail: "Cloud API" },
];

const fieldCount = (f) => (Array.isArray(f.fields) ? f.fields.length : f.fields || 0);

export default function Onboarding() {
  const { navigate } = useNav();
  const [step, setStep] = useState(0);
  const [pms, setPms] = useState(null);
  const [pmsConnected, setPmsConnected] = useState(false);
  const [picked, setPicked] = useState([]);

  const [connectors, setConnectors] = useState(null);
  const [connErr, setConnErr] = useState(false);
  const [templates, setTemplates] = useState(null);
  const [tplErr, setTplErr] = useState(false);
  const [users, setUsers] = useState(null);
  const [usersErr, setUsersErr] = useState(false);

  const loadConnectors = () => {
    setConnErr(false); setConnectors(null);
    api.settingsConnectors().then(setConnectors).catch(() => setConnErr(true));
  };
  const loadTemplates = () => {
    setTplErr(false); setTemplates(null);
    api.formTemplates().then((t) => {
      setTemplates(t);
      setPicked(t.slice(0, 3).map((x) => x.name));
    }).catch(() => setTplErr(true));
  };
  const loadUsers = () => {
    setUsersErr(false); setUsers(null);
    api.settingsUsers().then(setUsers).catch(() => setUsersErr(true));
  };

  useEffect(() => { loadConnectors(); loadTemplates(); loadUsers(); }, []);

  const next = () => (step < 3 ? setStep(step + 1) : navigate("today"));
  const togglePick = (n) => setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));

  const pmsOptions = (connectors || []).filter((c) => c.kind === "PMS" || c.kind === "EHR");
  const records = pmsOptions.length ? pmsOptions : DEFAULT_PMS;
  const messaging = (connectors || []).find((c) => c.kind === "Messaging");

  return (
    <div style={{ minHeight: "100vh", background: "var(--page)", display: "flex", flexDirection: "column" }}>
      <header className="row between" style={{ padding: "18px 28px", borderBottom: "1px solid var(--line)", background: "var(--surface)" }}>
        <div className="row" style={{ gap: 11 }}><span className="nav-logo">P</span><strong style={{ fontSize: 16 }}>Almond</strong></div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate("today")}>Skip setup<Icon name="chevR" size={14} /></button>
      </header>

      <div className="content" style={{ flex: 1 }}>
        <div className="wizard">
          <div className="wiz-steps">
            {STEPS.map((s, i) => (
              <div key={s} className={`wiz-step ${i < step ? "done" : i === step ? "current" : ""}`}>
                <span className="wiz-dot">{i < step ? <Icon name="check" size={15} strokeWidth={3} /> : i + 1}</span>
                <span className="ws-label">{s}</span>
              </div>
            ))}
          </div>

          <div className="card card-pad" style={{ padding: 32 }}>
            {step === 0 && (
              <>
                <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>Connect your record system</h1>
                <p className="muted" style={{ fontSize: 15, marginTop: 6, marginBottom: 24 }}>This is the one that matters. Once connected, everything Almond does shows up in your existing chart — automatically.</p>
                {connErr ? (
                  <ErrorState title="Couldn’t load record systems" onRetry={loadConnectors} />
                ) : connectors === null ? (
                  <SkelRows n={3} avatar={false} />
                ) : (
                  <div className="stack" style={{ gap: 10 }}>
                    {records.map((c) => {
                      const live = c.status === "connected";
                      return (
                        <button key={c.name} className="conn-card" style={{ cursor: "pointer", borderColor: pms === c.name ? "var(--p-500)" : "var(--line)", boxShadow: pms === c.name ? "0 0 0 3px rgba(74,122,95,0.14)" : "none", textAlign: "left" }} onClick={() => { setPms(c.name); setPmsConnected(live); }}>
                          <span className="conn-logo" style={{ background: "var(--p-50)", color: "var(--p-600)" }}>{c.name[0]}</span>
                          <div style={{ flex: 1 }}><strong>{c.name}</strong><div className="muted" style={{ fontSize: 13 }}>{c.detail || (c.name === "Open Dental" ? "Recommended — quickest to connect" : "Cloud API")}</div></div>
                          {live && pms !== c.name && <Badge tone="ok" icon="check">Connected</Badge>}
                          {pms === c.name && (pmsConnected ? <SyncPill state="saved" target={c.name} time="connected" /> : <Badge tone="pine" dot>Selected</Badge>)}
                        </button>
                      );
                    })}
                  </div>
                )}
                {pms && !pmsConnected && (
                  <div style={{ marginTop: 16 }}>
                    <Button variant="primary" icon="link" onClick={() => setPmsConnected(true)}>Connect {pms} securely</Button>
                  </div>
                )}
                <div className="alert alert-info" style={{ marginTop: 20 }}><Icon name="shield" className="ic" /><div>We use {pms || "your PMS"}'s official, sanctioned connection. No software is installed on your computers, and you stay in control.</div></div>
              </>
            )}

            {step === 1 && (
              <>
                <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>Turn on texting</h1>
                <p className="muted" style={{ fontSize: 15, marginTop: 6, marginBottom: 24 }}>So you can text patients form links, reminders, and confirmations — and never miss a call again.</p>
                <div className="conn-card" style={{ marginBottom: 14 }}>
                  <span className="conn-logo" style={{ background: "var(--a-50)", color: "var(--a-700)" }}>{messaging ? messaging.name[0] : "T"}</span>
                  <div style={{ flex: 1 }}><strong>{messaging ? messaging.name : "Twilio messaging"}</strong><div className="muted" style={{ fontSize: 13 }}>{messaging?.detail || "Texting over your practice number, under a signed BAA."}</div></div>
                  <SyncPill state="saved" target={messaging ? messaging.name : "Twilio"} time={messaging && messaging.status === "connected" ? "connected" : "ready"} />
                </div>
                <div className="card card-pad" style={{ background: "var(--n-25)" }}>
                  <div className="between"><div><strong>Missed-call text-back</strong><div className="muted" style={{ fontSize: 13 }}>Auto-text anyone whose call you miss.</div></div><Badge tone="ok" icon="check">On</Badge></div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>Pick your starter forms</h1>
                <p className="muted" style={{ fontSize: 15, marginTop: 6, marginBottom: 24 }}>We'll add these ready-to-go and brand them with your logo. Edit anytime.</p>
                {tplErr ? (
                  <ErrorState title="Couldn’t load form templates" onRetry={loadTemplates} />
                ) : templates === null ? (
                  <SkelRows n={4} />
                ) : (
                  <div className="stack" style={{ gap: 8 }}>
                    {templates.map((f) => (
                      <div key={f.id} className="conn-card" style={{ cursor: "pointer" }} onClick={() => togglePick(f.name)}>
                        <Checkbox checked={picked.includes(f.name)} onChange={() => togglePick(f.name)} />
                        <span className="conn-logo" style={{ background: "var(--p-50)", color: "var(--p-500)", width: 40, height: 40 }}><Icon name="forms" size={18} /></span>
                        <div style={{ flex: 1 }}><strong>{f.name}</strong><div className="muted" style={{ fontSize: 13 }}>{fieldCount(f)} fields · {f.category || "General"}</div></div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {step === 3 && (
              <>
                <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>Invite your team</h1>
                <p className="muted" style={{ fontSize: 15, marginTop: 6, marginBottom: 24 }}>Add your front desk so everyone works from the same inbox. You can set roles now or later.</p>
                <div className="stack" style={{ gap: 10 }}>
                  <div className="row" style={{ gap: 10 }}>
                    <input className="input" placeholder="name@practice.com" style={{ flex: 1 }} />
                    <select className="select" style={{ width: 160 }}><option>Front Desk</option><option>Office Manager</option><option>Owner / Admin</option></select>
                    <Button variant="secondary" icon="plus">Add</Button>
                  </div>
                  {usersErr ? (
                    <ErrorState title="Couldn’t load your team" onRetry={loadUsers} />
                  ) : users === null ? (
                    <SkelRows n={3} />
                  ) : (
                    users.slice(0, 3).map((m) => (
                      <div className="conn-card" key={m.email} style={{ padding: "12px 16px" }}>
                        <Avatar name={m.name} size="sm" />
                        <div style={{ flex: 1 }}><strong>{m.name}</strong> <span className="muted">· {m.email}</span></div>
                        <Badge tone={m.status === "invited" ? "warn" : "neutral"}>{m.role}</Badge>
                      </div>
                    ))
                  )}
                </div>
                <div className="alert alert-ok" style={{ marginTop: 20 }}><Icon name="checkCircle" className="ic" /><div><strong>You're all set!</strong> {pms || "Open Dental"} is connected, texting is on, and your forms are ready. Let's go.</div></div>
              </>
            )}

            <div className="between" style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
              <Button variant="ghost" icon="chevL" onClick={() => (step > 0 ? setStep(step - 1) : navigate("today"))} disabled={step === 0}>Back</Button>
              <div className="row" style={{ gap: 10 }}>
                <span className="muted" style={{ fontSize: 13 }}>Step {step + 1} of 4</span>
                <Button variant="primary" iconRight={step === 3 ? "check" : "arrowRight"} onClick={next} disabled={step === 0 && !pmsConnected}>{step === 3 ? "Finish & open Almond" : "Continue"}</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
