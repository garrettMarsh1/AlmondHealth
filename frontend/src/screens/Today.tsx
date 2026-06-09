import { useState, useEffect } from "react";
import { Button, Badge, SyncPill, Avatar, StatCard } from "../ui";
import { useNav } from "../ctx";
import { api } from "../api";
import type { Lead, LeadStage, Appointment, Conversation } from "../types";

const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : "");
const STAGE_TONE: Record<LeadStage, string> = { new: "apricot", contacted: "warn", booked: "pine", converted: "ok" };

interface ApptStatusProps {
  status?: string | null;
}

function ApptStatus({ status }: ApptStatusProps) {
  const s = (status || "").toLowerCase();
  const tone = s.includes("complete") ? "ok" : s.includes("sched") ? "ok" : "warn";
  return <Badge tone={tone} icon="check">{status || "Scheduled"}</Badge>;
}

export default function Today() {
  const { navigate } = useNav();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    const start = new Date().toISOString().slice(0, 10);
    const end = new Date(Date.now() + 120 * 864e5).toISOString().slice(0, 10);
    api.leads().then(setLeads).catch(() => {});
    api.appointments(start, end).then((a) => setAppts(a || [])).catch(() => {});
    api.conversations().then((c) => setConversations(c || [])).catch(() => {});
  }, []);

  const followups = leads.filter((l) => ["new", "contacted"].includes(l.stage)).slice(0, 4);
  const newCount = leads.filter((l) => l.stage === "new").length;
  const unread = conversations.filter((c) => (c.unread || 0) > 0);
  const fmt = (iso: string): string => {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };

  return (
    <div className="content"><div className="content-wide">
      <div className="page-head page-head-row">
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Live · Open Dental</div>
          <h1>Good morning, Dana</h1>
          <div className="ph-sub">Here's what needs you this morning. Everything's in sync with Open Dental.</div>
        </div>
        <div className="row">
          <Button variant="secondary" icon="phoneMissed" onClick={() => navigate("leads")}>Log a call</Button>
          <Button variant="primary" icon="send" onClick={() => navigate("sendform")}>Send a form</Button>
        </div>
      </div>

      <div className="statgrid" style={{ marginBottom: 20 }}>
        <StatCard icon="leads" label="New leads" value={String(newCount)} delta={newCount ? `+${newCount}` : undefined} good hint="from calls + web" onClick={() => navigate("leads")} />
        <StatCard icon="calendar" label="Upcoming appts" value={String(appts.length)} hint="live from PMS" onClick={() => navigate("leads")} />
        <StatCard icon="forms" label="Leads in pipeline" value={String(leads.length)} hint="all stages" onClick={() => navigate("leads")} />
        <StatCard icon="message" label="Unread messages" value={String(unread.length)} delta="new" good accent onClick={() => navigate("messages")} />
        <StatCard icon="phoneMissed" label="Calls to follow up" value={String(leads.filter((l) => l.stage === "contacted").length)} hint="awaiting reply" onClick={() => navigate("leads")} />
      </div>

      <div className="grid-dash">
        <div className="card">
          <div className="card-head">
            <div className="card-title">Upcoming schedule</div>
            <div className="row" style={{ gap: 10 }}>
              <SyncPill state="saved" target="Open Dental" time="just now" />
              <Button variant="ghost" size="sm" iconRight="chevR" onClick={() => navigate("scheduler")}>Open scheduler</Button>
            </div>
          </div>
          <div>
            {appts.length === 0 && (
              <div className="lrow"><div className="lr-main"><div className="lr-sub">No upcoming appointments in the sandbox window — book one from a lead to see it appear here.</div></div></div>
            )}
            {appts.slice(0, 8).map((a) => (
              <div className="lrow" key={a.id}>
                <div style={{ width: 132, flex: "none" }}><div style={{ fontWeight: 700, fontSize: 13 }}>{fmt(a.start)}</div></div>
                <div style={{ width: 3, height: 34, borderRadius: 9, background: "var(--p-300)", flex: "none" }} />
                <div className="lr-main"><div className="lr-title">{a.patient_name || `Patient #${a.patient_id}`}</div><div className="lr-sub">{a.reason || "Appointment"} · Op {a.operatory_id || "—"}</div></div>
                <ApptStatus status={a.status} />
              </div>
            ))}
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-head"><div className="card-title">Follow up</div><Button variant="ghost" size="sm" iconRight="chevR" onClick={() => navigate("leads")}>Inbox</Button></div>
            <div>
              {followups.map((l) => (
                <div className="lrow" key={l.id} onClick={() => navigate("leads", { leadId: l.id })} style={{ cursor: "pointer" }}>
                  <Avatar name={l.name} size="sm" />
                  <div className="lr-main"><div className="lr-title">{l.name}</div><div className="lr-sub">{l.source === "Missed call" ? "📞 " : ""}{l.reason}</div></div>
                  <Badge tone={STAGE_TONE[l.stage]} dot>{cap(l.stage)}</Badge>
                </div>
              ))}
              {followups.length === 0 && <div className="lrow"><div className="lr-main"><div className="lr-sub">No new leads.</div></div></div>}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">Unread messages</div><Button variant="ghost" size="sm" iconRight="chevR" onClick={() => navigate("messages")}>Open</Button></div>
            <div>
              {unread.map((c) => (
                <div className="lrow" key={c.id}>
                  <Avatar name={c.name} size="sm" />
                  <div className="lr-main"><div className="lr-title">{c.name}</div><div className="lr-sub">{c.last || "New message"}</div></div>
                  <div style={{ textAlign: "right", flex: "none" }}>
                    <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>{c.when || ""}</div>
                    <span className="conv-unread" style={{ marginTop: 4, display: "inline-grid" }}>{c.unread}</span>
                  </div>
                </div>
              ))}
              {unread.length === 0 && <div className="lrow"><div className="lr-main"><div className="lr-sub">No unread messages.</div></div></div>}
            </div>
          </div>
        </div>
      </div>
    </div></div>
  );
}
