import { useState, useEffect } from "react";
import { Icon, Avatar, SyncPill, ToastProvider, EmptyState } from "./ui";
import { NavProvider } from "./ctx";
import { DATA } from "./data";
import { setToken as persistToken } from "./api";
import Login from "./screens/Login.jsx";
import Today from "./screens/Today.jsx";
import Leads from "./screens/Leads.jsx";
import SendForm from "./screens/SendForm.jsx";
import Scheduler from "./screens/Scheduler.jsx";
import Reports from "./screens/Reports.jsx";
import Forms from "./screens/Forms.jsx";
import PatientTimeline from "./screens/PatientTimeline.jsx";
import Messages from "./screens/Messages.jsx";
import Settings from "./screens/Settings.jsx";
import Onboarding from "./screens/Onboarding.jsx";
import PatientForm from "./screens/PatientForm.jsx";
import PatientBooking from "./screens/PatientBooking.jsx";

const FRONT_OFFICE = {
  section: "Front office",
  items: [
    { key: "today", label: "Today", icon: "today" },
    { key: "leads", label: "Leads & calls", icon: "leads" },
    { key: "scheduler", label: "Scheduler", icon: "calendar" },
    { key: "messages", label: "Messages", icon: "message" },
  ],
};

const RECORDS = {
  section: "Records",
  items: [
    { key: "forms", label: "Forms", icon: "forms" },
    { key: "sendform", label: "Send a form", icon: "send" },
    { key: "patient", label: "Patient timeline", icon: "timeline" },
  ],
};

const OWNER = {
  section: "Owner",
  items: [
    { key: "reports", label: "Reports & ROI", icon: "reports" },
    { key: "settings", label: "Settings", icon: "settings" },
  ],
};

const TITLES = {
  today: "Today", leads: "Leads & calls", scheduler: "Scheduler", messages: "Messages",
  forms: "Forms", sendform: "Send a form", patient: "Patient timeline",
  reports: "Reports & ROI", settings: "Settings", onboarding: "Set up PracticeBridge",
};

const SCREENS = {
  today: Today, leads: Leads, scheduler: Scheduler, messages: Messages,
  forms: Forms, sendform: SendForm, patient: PatientTimeline,
  reports: Reports, settings: Settings, onboarding: Onboarding,
};

const LIVE = new Set([
  "today", "leads", "scheduler", "messages",
  "forms", "sendform", "patient", "reports", "settings",
]);

const isOwner = (user) => {
  const role = (user?.role || "").toLowerCase();
  return role.includes("owner") || role.includes("admin");
};

function readStoredUser() {
  try {
    const raw = localStorage.getItem("pb_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function Placeholder({ title }) {
  return (
    <div className="content"><div className="content-wide">
      <div className="page-head"><h1>{title}</h1><div className="ph-sub">Designed in the prototype — next to wire to /v1. Today, Leads &amp; calls, and Send a form are already live to Open Dental.</div></div>
      <div className="card"><EmptyState icon="sparkle" title="Ready to wire" desc="This screen exists in the design system and connects to the same canonical /v1 API behind the connector layer." /></div>
    </div></div>
  );
}

function PatientRoute({ hash }) {
  if (hash.startsWith("#p/form/")) return <PatientForm />;
  if (hash.startsWith("#p/book")) return <PatientBooking />;
  return null;
}

function Shell({ user, onSignOut }) {
  const owner = isOwner(user);
  const nav = owner ? [FRONT_OFFICE, RECORDS, OWNER] : [FRONT_OFFICE, RECORDS];

  const initial = (location.hash || "#today").slice(1);
  const [route, setRoute] = useState(SCREENS[initial] ? initial : "today");
  const [params, setParams] = useState({});
  const [userMenu, setUserMenu] = useState(false);
  const navigate = (key, p = {}) => { setRoute(key); setParams(p); location.hash = key; window.scrollTo(0, 0); };
  const Screen = SCREENS[route] || (() => <Placeholder title={TITLES[route] || "Screen"} />);

  if (route === "onboarding") {
    return (
      <NavProvider value={{ navigate, route, params }}>
        <Screen />
      </NavProvider>
    );
  }

  return (
    <NavProvider value={{ navigate, route, params }}>
      <div className="app">
        <nav className="nav">
          <div className="nav-brand">
            <span className="nav-logo">P</span>
            <div><div className="nb-name">PracticeBridge</div><div className="nb-sub">{DATA.practice.name}</div></div>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {nav.map((sec) => (
              <div className="nav-sec" key={sec.section}>
                <div className="nav-sec-label">{sec.section}</div>
                {sec.items.map((it) => (
                  <button key={it.key} className={`nav-item ${route === it.key ? "active" : ""}`} onClick={() => navigate(it.key)}>
                    <Icon name={it.icon} size={18} className="ni-ic" />
                    <span className="ni-label">{it.label}</span>
                    {LIVE.has(it.key) && <span className="ni-badge" style={{ background: "var(--ok-bg)", color: "var(--ok-ink)" }}>live</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="nav-foot">
            <button className="nav-item" style={{ marginBottom: 4 }} onClick={() => navigate("onboarding")}>
              <Icon name="sparkle" size={18} className="ni-ic" /><span className="ni-label">Setup wizard</span>
            </button>
            <div className="nav-user" onClick={() => setUserMenu((v) => !v)} style={{ cursor: "pointer" }}>
              <Avatar name={user?.name || DATA.user.name} size="md" />
              <div style={{ minWidth: 0 }}><div className="nu-name">{user?.name || DATA.user.name}</div><div className="nu-role">{user?.role || DATA.user.role}</div></div>
              <Icon name="chevD" size={15} style={{ marginLeft: "auto", color: "var(--ink-muted)" }} />
            </div>
            {userMenu && (
              <button className="nav-item" style={{ marginTop: 4 }} onClick={onSignOut}>
                <Icon name="lock" size={18} className="ni-ic" /><span className="ni-label">Sign out</span>
              </button>
            )}
          </div>
        </nav>

        <div className="main">
          <header className="topbar">
            <div className="tb-title">{TITLES[route]}</div>
            <div className="spacer" />
            <div className="tb-actions">
              <span className="tb-lock"><Icon name="lock" size={13} />Auto-lock in 14:32</span>
              <SyncPill state="saved" target={DATA.practice.pms} time="live" />
              <button className="btn-icon" aria-label="Notifications"><Icon name="bell" /></button>
            </div>
          </header>
          <Screen />
        </div>
      </div>
    </NavProvider>
  );
}

export default function App() {
  const [hash, setHash] = useState(location.hash || "");
  const [user, setUser] = useState(readStoredUser);
  const [token, setTokenState] = useState(() => localStorage.getItem("pb_token"));

  useEffect(() => {
    const onHash = () => setHash(location.hash || "");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const isPatientRoute = hash.startsWith("#p/form/") || hash.startsWith("#p/book");

  if (isPatientRoute) return <PatientRoute hash={hash} />;

  const onSuccess = (u, t) => {
    persistToken(t);
    try { localStorage.setItem("pb_user", JSON.stringify(u || {})); } catch {}
    setUser(u);
    setTokenState(t);
  };

  const onSignOut = () => {
    persistToken(null);
    try { localStorage.removeItem("pb_user"); } catch {}
    setUser(null);
    setTokenState(null);
    location.hash = "today";
  };

  if (!token) {
    return (
      <ToastProvider>
        <Login onSuccess={onSuccess} />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <Shell user={user} onSignOut={onSignOut} />
    </ToastProvider>
  );
}
