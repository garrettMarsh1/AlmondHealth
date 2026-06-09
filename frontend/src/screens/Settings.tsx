import { useState, useEffect } from "react";
import { Button, Badge, SyncPill, Avatar, Toggle, Modal, EmptyState, ErrorState, SkelRows, useToast, Icon } from "../ui";
import { api } from "../api";
import { DATA } from "../data";
import type { Connector, User, AuditEntry } from "../types";

const PMS_COLOR: Record<string, string> = { "Open Dental": "#2f5d4a", "Twilio SMS": "#c5743c", Denticon: "#3f6d8c", NextGen: "#7a5ea8" };

type TabKey = "connections" | "team" | "branding" | "audit";

interface TabDef {
  key: TabKey;
  label: string;
  icon: string;
}

const TABS: TabDef[] = [
  { key: "connections", label: "Connect your system", icon: "link" },
  { key: "team", label: "Team & roles", icon: "users" },
  { key: "branding", label: "Branding & hours", icon: "building" },
  { key: "audit", label: "Audit log", icon: "shield" },
];

type ConnectPhase = "form" | "connecting" | "done";

interface ConnectModalProps {
  conn: Connector | null;
  onClose: () => void;
  onConnected: (conn: Connector) => void;
}

function ConnectModal({ conn, onClose, onConnected }: ConnectModalProps) {
  const [phase, setPhase] = useState<ConnectPhase>("form");
  if (!conn) return null;
  return (
    <Modal open onClose={onClose} width={480} title={`Connect ${conn.name}`}
      footer={phase === "done"
        ? <Button variant="primary" icon="check" className="btn-block" onClick={onClose}>Done</Button>
        : <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" icon="link" loading={phase === "connecting"} onClick={() => { setPhase("connecting"); setTimeout(() => { setPhase("done"); onConnected(conn); }, 1800); }}>{phase === "connecting" ? "Connecting…" : "Connect securely"}</Button></>}>
      {phase === "done" ? (
        <div className="empty" style={{ padding: "12px 0" }}>
          <span className="em-ic" style={{ background: "var(--ok-bg)", color: "var(--ok)" }}><Icon name="checkCircle" /></span>
          <h3>{conn.name} connected</h3>
          <p>We can now read your schedule and write appointments, patients, and form PDFs back automatically.</p>
        </div>
      ) : (
        <>
          <div className="alert alert-info" style={{ marginBottom: 18 }}>
            <Icon name="shield" className="ic" />
            <div>Almond connects through {conn.name}'s official, sanctioned interface. We never touch your server directly, and you can disconnect anytime.</div>
          </div>
          <div className="stack" style={{ gap: 14 }}>
            <div className="field"><label className="label">Developer key</label><input className="input mono" placeholder="•••• •••• •••• 4821" /><span className="hint">Find this in {conn.name} → Setup → API. We'll walk you through it.</span></div>
            <div className="field"><label className="label">Practice location</label><select className="select"><option>{DATA.practice.name} — {DATA.practice.location}</option></select></div>
          </div>
        </>
      )}
    </Modal>
  );
}

function ConnectionsTab() {
  const [conns, setConns] = useState<Connector[] | null>(null);
  const [error, setError] = useState(false);
  const [connecting, setConnecting] = useState<Connector | null>(null);

  const load = () => {
    setError(false);
    setConns(null);
    api.settingsConnectors().then(setConns).catch(() => setError(true));
  };
  useEffect(() => { load(); }, []);

  if (error) return <div className="card"><ErrorState onRetry={load} /></div>;
  if (!conns) return <div className="card" style={{ overflow: "hidden" }}><SkelRows n={3} avatar={false} /></div>;
  if (conns.length === 0)
    return <div className="card"><EmptyState icon="link" title="Nothing connected" desc="Connect your record system to start syncing." action={<Button variant="primary" icon="plus">Connect a system</Button>} /></div>;

  return (
    <>
      <div className="stack">
        <div className="alert alert-ok"><Icon name="checkCircle" className="ic" /><div><strong>You're connected to Open Dental.</strong> Everything Almond saves shows up in your chart automatically.</div></div>
        {conns.map((c) => (
          <div className="conn-card" key={c.name}>
            <span className="conn-logo" style={{ background: (PMS_COLOR[c.name] || "#888") + "18", color: PMS_COLOR[c.name] || "#888" }}>{c.name[0]}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="row" style={{ gap: 8 }}><strong>{c.name}</strong><Badge tone="neutral">{c.kind}</Badge></div>
              <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{c.detail}</div>
            </div>
            {c.status === "connected"
              ? <div className="row" style={{ gap: 10 }}><SyncPill state="saved" target={c.name} /><Button variant="ghost" size="sm">Manage</Button></div>
              : <Button variant="secondary" icon="link" onClick={() => setConnecting(c)}>Connect</Button>}
          </div>
        ))}
      </div>
      {connecting && <ConnectModal conn={connecting} onClose={() => setConnecting(null)} onConnected={(c) => setConns((cs) => (cs ?? []).map((x) => x.name === c.name ? { ...x, status: "connected", detail: "Synced just now" } : x))} />}
    </>
  );
}

function TeamTab() {
  const toast = useToast();
  const [team, setTeam] = useState<User[] | null>(null);
  const [error, setError] = useState(false);

  const load = () => {
    setError(false);
    setTeam(null);
    api.settingsUsers().then(setTeam).catch(() => setError(true));
  };
  useEffect(() => { load(); }, []);

  const access = (role: string) =>
    role.includes("Admin") || role.includes("Owner") ? "Full + billing + reports"
      : role.includes("Manager") ? "All front office"
        : "Leads, messages, forms";

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div className="card-head"><div className="card-title">Team &amp; roles</div><Button variant="primary" size="sm" icon="userPlus" onClick={() => toast({ title: "Invite sent", icon: "mail" })}>Invite</Button></div>
      {error ? (
        <ErrorState onRetry={load} />
      ) : !team ? (
        <SkelRows n={4} />
      ) : team.length === 0 ? (
        <EmptyState icon="users" title="No team members yet" desc="Invite your front desk and providers to collaborate." />
      ) : (
        <table className="tbl">
          <thead><tr><th>Member</th><th>Role</th><th>Access</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {team.map((m) => (
              <tr key={m.id || m.email}>
                <td><div className="row" style={{ gap: 10 }}><Avatar name={m.name} size="sm" /><div><div style={{ fontWeight: 600 }}>{m.name}</div><div className="muted" style={{ fontSize: 12 }}>{m.email}</div></div></div></td>
                <td>{m.role}</td>
                <td className="muted" style={{ fontSize: 12.5 }}>{access(m.role)}</td>
                <td><Badge tone={m.status === "active" ? "ok" : "warn"} dot>{m.status === "active" ? "Active" : "Invited"}</Badge></td>
                <td><button className="btn-icon"><Icon name="more" size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="card-pad" style={{ borderTop: "1px solid var(--line)" }}>
        <div className="row" style={{ gap: 10 }}><Icon name="shield" size={16} style={{ color: "var(--ink-muted)" }} /><span className="muted" style={{ fontSize: 13 }}>Role-based access controls what each person can see. Front desk never sees billing or full reports.</span></div>
      </div>
    </div>
  );
}

function BrandingTab() {
  return (
    <div className="stack">
      <div className="card card-pad">
        <div className="card-title" style={{ marginBottom: 16 }}>Practice branding</div>
        <div className="row" style={{ gap: 16, marginBottom: 18 }}>
          <span style={{ width: 60, height: 60, borderRadius: 14, background: "var(--p-500)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 26 }}>B</span>
          <div><Button variant="secondary" size="sm" icon="download">Upload logo</Button><div className="muted" style={{ fontSize: 12, marginTop: 6 }}>Shows on patient forms &amp; booking pages.</div></div>
        </div>
        <div className="grid2" style={{ gap: 14 }}>
          <div className="field"><label className="label">Practice name</label><input className="input" defaultValue={DATA.practice.name} /></div>
          <div className="field"><label className="label">Brand color</label><div className="row" style={{ gap: 8 }}>{["#2f5d4a", "#c5743c", "#3f6d8c", "#7a5ea8"].map((c, i) => <span key={c} style={{ width: 38, height: 38, borderRadius: 9, background: c, border: i === 0 ? "3px solid var(--ink)" : "3px solid transparent", cursor: "pointer" }} />)}</div></div>
        </div>
      </div>
      <div className="card">
        <div className="card-head"><div className="card-title" style={{ fontSize: 15 }}>Business hours</div></div>
        <div>
          {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((d) => (
            <div className="between" key={d} style={{ padding: "12px 18px", borderBottom: "1px solid var(--line)" }}><div className="row" style={{ gap: 12 }}><Toggle checked={true} onChange={() => {}} /><strong style={{ width: 90 }}>{d}</strong></div><div className="row" style={{ gap: 8 }}><span className="kbd">8:00 AM</span>–<span className="kbd">5:00 PM</span></div></div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuditTab() {
  const [log, setLog] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState(false);

  const load = () => {
    setError(false);
    setLog(null);
    api.settingsAudit().then(setLog).catch(() => setError(true));
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div className="card-head"><div className="card-title">Audit log</div><Button variant="ghost" size="sm" icon="download">Export</Button></div>
      <div className="alert alert-info" style={{ margin: 16, marginBottom: 0 }}><Icon name="lock" className="ic" /><div>Every action that touches patient data is recorded here for HIPAA accountability — who, what, when, and where it synced.</div></div>
      {error ? (
        <div style={{ padding: 16 }}><ErrorState onRetry={load} /></div>
      ) : !log ? (
        <div style={{ marginTop: 8 }}><SkelRows n={5} avatar={false} /></div>
      ) : log.length === 0 ? (
        <EmptyState icon="shield" title="No activity recorded" desc="Actions that touch patient data will show up here." />
      ) : (
        <table className="tbl" style={{ marginTop: 8 }}>
          <thead><tr><th>Who</th><th>Action</th><th>Record</th><th>When</th><th>Synced to</th></tr></thead>
          <tbody>
            {log.map((a, i) => (
              <tr key={a.id || i}>
                <td><div className="row" style={{ gap: 8 }}>{a.who === "System" ? <span className="statcard-ic" style={{ width: 28, height: 28 }}><Icon name="zap" size={14} /></span> : <Avatar name={a.who} size="sm" />}<span style={{ fontWeight: 600 }}>{a.who}</span></div></td>
                <td>{a.action}</td>
                <td className="muted">{a.target}</td>
                <td className="muted mono" style={{ fontSize: 12 }}>{a.when}</td>
                <td>{a.sync && a.sync !== "—" && a.sync !== "-" ? <Badge tone="ok" icon="check">{a.sync}</Badge> : <span className="muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function Settings() {
  const [tab, setTab] = useState<TabKey>("connections");

  return (
    <div className="content">
      <div className="content-wide">
        <div className="page-head"><h1>Settings</h1><div className="ph-sub">Connect your record system, manage your team, and keep an eye on the audit trail.</div></div>

        <div style={{ display: "grid", gridTemplateColumns: "230px 1fr", gap: 24, alignItems: "start" }}>
          <div className="card" style={{ padding: 8, position: "sticky", top: 84 }}>
            {TABS.map((t) => (
              <button key={t.key} className={`nav-item ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
                <Icon name={t.icon} size={17} className="ni-ic" />{t.label}
              </button>
            ))}
          </div>

          <div>
            {tab === "connections" && <ConnectionsTab />}
            {tab === "team" && <TeamTab />}
            {tab === "branding" && <BrandingTab />}
            {tab === "audit" && <AuditTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
