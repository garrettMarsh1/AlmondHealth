import { useState, useEffect } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Button, Icon, EmptyState, SkelRows, ErrorState, UpgradePrompt, useToast } from "../ui";
import { api, ApiError } from "../api";
import { useNav } from "../ctx";
import { hasFeature } from "../entitlements";
import type { WaitlistEntry } from "../types";

type Status = "loading" | "ready" | "error";

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export default function Waitlist() {
  const toast = useToast();
  const { navigate } = useNav();
  const canFill = hasFeature("waitlist_autofill");
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [filling, setFilling] = useState(false);
  const [gated, setGated] = useState(false);

  const load = () => {
    setStatus("loading");
    api.waitlist().then((rows) => { setEntries(rows); setStatus("ready"); }).catch(() => setStatus("error"));
  };
  useEffect(() => { load(); }, []);

  const add = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!name || busy) return;
    setBusy(true);
    try {
      await api.addWaitlist({ name, phone: phone || undefined, reason: reason || undefined });
      setName(""); setPhone(""); setReason("");
      load();
    } catch {
      toast({ tone: "error", title: "Couldn't add", icon: "alertTri" });
    }
    setBusy(false);
  };

  const remove = async (id: string) => {
    await api.removeWaitlist(id).catch(() => undefined);
    load();
  };

  const fill = async () => {
    if (filling) return;
    setFilling(true);
    try {
      const res = await api.fillWaitlist(isoDate(0), isoDate(14));
      toast({ tone: "success", title: `Texted ${res.notified} patient${res.notified === 1 ? "" : "s"}`, desc: "An opening was offered to the waitlist", icon: "checkCircle" });
      load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) setGated(true);
      else if (err instanceof ApiError && err.status === 409) toast({ tone: "default", title: "No open slots", desc: "No openings in the next two weeks to offer.", icon: "info" });
      else toast({ tone: "error", title: "Fill failed", icon: "alertTri" });
    }
    setFilling(false);
  };

  const active = entries.filter((e) => e.status === "active");

  return (
    <div className="content">
      <div className="content-wide">
        <div className="page-head page-head-row">
          <div><h1>Waitlist</h1><div className="ph-sub">When a slot opens, fill it instantly — text every waiting patient at once.</div></div>
          {canFill
            ? <Button variant="primary" icon="zap" loading={filling} onClick={fill} disabled={active.length === 0}>Fill next opening</Button>
            : <Button variant="primary" icon="zap" onClick={() => navigate("billing")}>Unlock auto-fill</Button>}
        </div>

        {(gated || !canFill) && (
          <div style={{ marginBottom: 20 }}>
            <UpgradePrompt
              title="Waitlist auto-fill is a Pro feature"
              desc="Cancellations cost a practice $30k–$133k a year. Auto-fill texts your whole waitlist the moment a slot opens and books the first to reply. Upgrade to Pro to turn it on."
              requiredPlan="Pro"
              onUpgrade={() => navigate("billing")}
            />
          </div>
        )}

        <div className="card">
          <form className="card-pad" onSubmit={add} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.4fr auto", gap: 10, alignItems: "end", borderBottom: "1px solid var(--line)" }}>
            <div className="field"><label className="label">Patient name</label><input className="input" value={name} onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="Jordan Smith" /></div>
            <div className="field"><label className="label">Phone</label><input className="input" value={phone} onChange={(e: ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)} placeholder="(512) 555-0123" /></div>
            <div className="field"><label className="label">Reason</label><input className="input" value={reason} onChange={(e: ChangeEvent<HTMLInputElement>) => setReason(e.target.value)} placeholder="Cleaning, flexible mornings" /></div>
            <Button variant="secondary" type="submit" icon="plus" loading={busy} disabled={!name}>Add</Button>
          </form>

          {status === "loading" && <div className="card-pad"><SkelRows n={4} /></div>}
          {status === "error" && <ErrorState onRetry={load} />}
          {status === "ready" && entries.length === 0 && <EmptyState icon="calendar" title="No one waiting" desc="Add patients who want an earlier slot — Almond texts them when one opens." />}
          {status === "ready" && entries.map((e) => (
            <div key={e.id} className="lrow" style={{ gap: 13, padding: "13px 18px", borderBottom: "1px solid var(--line)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{e.name}</div>
                <div className="muted" style={{ fontSize: 12.5 }}>{[e.phone, e.reason].filter(Boolean).join(" · ")}</div>
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: e.status === "notified" ? "var(--ok-ink)" : "var(--ink-muted)", background: e.status === "notified" ? "var(--ok-bg)" : "var(--n-100)", padding: "3px 9px", borderRadius: 99 }}>{e.status === "notified" ? "Texted" : "Waiting"}</span>
              <button className="btn-icon" aria-label="Remove" onClick={() => remove(e.id)}><Icon name="trash" size={16} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
