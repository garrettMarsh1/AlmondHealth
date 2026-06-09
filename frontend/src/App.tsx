import { useState, useEffect } from "react";
import type { ComponentType } from "react";
import { Icon, Avatar, SyncPill, ToastProvider, EmptyState } from "./ui";
import { NavProvider } from "./ctx";
import { DATA } from "./data";
import { setToken as persistToken } from "./api";
import type { User } from "./types";
import Login from "./screens/Login";
import Today from "./screens/Today";
import Leads from "./screens/Leads";
import SendForm from "./screens/SendForm";
import Scheduler from "./screens/Scheduler";
import Reports from "./screens/Reports";
import Forms from "./screens/Forms";
import PatientTimeline from "./screens/PatientTimeline";
import Messages from "./screens/Messages";
import Settings from "./screens/Settings";
import Onboarding from "./screens/Onboarding";
import PatientForm from "./screens/PatientForm";
import PatientBooking from "./screens/PatientBooking";
import Waitlist from "./screens/Waitlist";
import Reviews from "./screens/Reviews";
import Billing from "./screens/Billing";
import { hasFeature, clearEntitlements } from "./entitlements";

interface NavItem {
  key: string;
  label: string;
  icon: string;
}

interface NavSection {
  section: string;
  items: NavItem[];
}

const FRONT_OFFICE: NavSection = {
  section: "Front office",
  items: [
    { key: "today", label: "Today", icon: "today" },
    { key: "leads", label: "Leads & calls", icon: "leads" },
    { key: "scheduler", label: "Scheduler", icon: "calendar" },
    { key: "messages", label: "Messages", icon: "message" },
  ],
};

const RECORDS: NavSection = {
  section: "Records",
  items: [
    { key: "forms", label: "Forms", icon: "forms" },
    { key: "sendform", label: "Send a form", icon: "send" },
    { key: "patient", label: "Patient timeline", icon: "timeline" },
  ],
};

const GROWTH: NavSection = {
  section: "Growth",
  items: [
    { key: "waitlist", label: "Waitlist", icon: "calendar" },
    { key: "reviews", label: "Reviews", icon: "star" },
  ],
};

const OWNER: NavSection = {
  section: "Owner",
  items: [
    { key: "reports", label: "Reports & ROI", icon: "reports" },
    { key: "billing", label: "Plan & billing", icon: "dollar" },
    { key: "settings", label: "Settings", icon: "settings" },
  ],
};

const NAV_FEATURE: Record<string, string> = {
  waitlist: "waitlist_autofill",
  reviews: "review_automation",
};

const TITLES: Record<string, string> = {
  today: "Today", leads: "Leads & calls", scheduler: "Scheduler", messages: "Messages",
  forms: "Forms", sendform: "Send a form", patient: "Patient timeline",
  waitlist: "Waitlist", reviews: "Reviews",
  reports: "Reports & ROI", billing: "Plan & billing", settings: "Settings", onboarding: "Set up Almond",
};

const SCREENS: Record<string, ComponentType> = {
  today: Today, leads: Leads, scheduler: Scheduler, messages: Messages,
  forms: Forms, sendform: SendForm, patient: PatientTimeline,
  waitlist: Waitlist, reviews: Reviews,
  reports: Reports, billing: Billing, settings: Settings, onboarding: Onboarding,
};

const LIVE = new Set<string>([
  "today", "leads", "scheduler", "messages",
  "forms", "sendform", "patient", "waitlist", "reviews",
  "reports", "billing", "settings",
]);

const isOwner = (user: User | null): boolean => {
  const role = (user?.role || "").toLowerCase();
  return role.includes("owner") || role.includes("admin");
};

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem("pb_user");
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

interface PlaceholderProps {
  title: string;
}

function Placeholder({ title }: PlaceholderProps) {
  return (
    <div className="content"><div className="content-wide">
      <div className="page-head"><h1>{title}</h1><div className="ph-sub">Designed in the prototype — next to wire to /v1. Today, Leads &amp; calls, and Send a form are already live to Open Dental.</div></div>
      <div className="card"><EmptyState icon="sparkle" title="Ready to wire" desc="This screen exists in the design system and connects to the same canonical /v1 API behind the connector layer." /></div>
    </div></div>
  );
}

interface PatientRouteProps {
  hash: string;
}

function PatientRoute({ hash }: PatientRouteProps) {
  if (hash.startsWith("#p/form/")) return <PatientForm />;
  if (hash.startsWith("#p/book")) return <PatientBooking />;
  return null;
}

interface ShellProps {
  user: User | null;
  onSignOut: () => void;
}

function Shell({ user, onSignOut }: ShellProps) {
  const owner = isOwner(user);
  const nav = owner ? [FRONT_OFFICE, RECORDS, GROWTH, OWNER] : [FRONT_OFFICE, RECORDS, GROWTH];

  const initial = (location.hash || "#today").slice(1);
  const [route, setRoute] = useState(SCREENS[initial] ? initial : "today");
  const [params, setParams] = useState<Record<string, unknown>>({});
  const [userMenu, setUserMenu] = useState(false);
  const navigate = (key: string, p: Record<string, unknown> = {}) => { setRoute(key); setParams(p); location.hash = key; window.scrollTo(0, 0); };
  const Screen: ComponentType = SCREENS[route] || (() => <Placeholder title={TITLES[route] || "Screen"} />);

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
            <span className="nav-logo">A</span>
            <div><div className="nb-name">Almond</div><div className="nb-sub">{DATA.practice.name}</div></div>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {nav.map((sec) => (
              <div className="nav-sec" key={sec.section}>
                <div className="nav-sec-label">{sec.section}</div>
                {sec.items.map((it) => (
                  <button key={it.key} className={`nav-item ${route === it.key ? "active" : ""}`} onClick={() => navigate(it.key)}>
                    <Icon name={it.icon} size={18} className="ni-ic" />
                    <span className="ni-label">{it.label}</span>
                    {NAV_FEATURE[it.key] && !hasFeature(NAV_FEATURE[it.key])
                      ? <Icon name="lock" size={13} style={{ marginLeft: "auto", color: "var(--ink-muted)" }} />
                      : LIVE.has(it.key) && <span className="ni-badge" style={{ background: "var(--ok-bg)", color: "var(--ok-ink)" }}>live</span>}
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
  const [user, setUser] = useState<User | null>(readStoredUser);
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem("pb_token"));

  useEffect(() => {
    const onHash = () => setHash(location.hash || "");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const isPatientRoute = hash.startsWith("#p/form/") || hash.startsWith("#p/book");

  if (isPatientRoute) return <PatientRoute hash={hash} />;

  const onSuccess = (u: User, t: string) => {
    persistToken(t);
    try { localStorage.setItem("pb_user", JSON.stringify(u || {})); } catch {}
    setUser(u);
    setTokenState(t);
  };

  const onSignOut = () => {
    persistToken(null);
    clearEntitlements();
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
