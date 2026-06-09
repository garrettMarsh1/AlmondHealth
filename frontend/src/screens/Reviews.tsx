import { useState, useEffect } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Button, Icon, EmptyState, SkelRows, ErrorState, UpgradePrompt, useToast } from "../ui";
import { api, ApiError } from "../api";
import { useNav } from "../ctx";
import { hasFeature } from "../entitlements";
import type { ReviewRequest } from "../types";

type Status = "loading" | "ready" | "error";

export default function Reviews() {
  const toast = useToast();
  const { navigate } = useNav();
  const canSend = hasFeature("review_automation");
  const [items, setItems] = useState<ReviewRequest[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [gated, setGated] = useState(false);

  const load = () => {
    setStatus("loading");
    api.reviews().then((rows) => { setItems(rows); setStatus("ready"); }).catch(() => setStatus("error"));
  };
  useEffect(() => { load(); }, []);

  const send = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!name || busy) return;
    setBusy(true);
    try {
      await api.requestReview({ name, phone: phone || undefined });
      setName(""); setPhone("");
      toast({ tone: "success", title: "Review request sent", desc: "A Google review link was texted", icon: "checkCircle" });
      load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) setGated(true);
      else toast({ tone: "error", title: "Couldn't send", icon: "alertTri" });
    }
    setBusy(false);
  };

  return (
    <div className="content">
      <div className="content-wide">
        <div className="page-head"><h1>Reviews</h1><div className="ph-sub">Turn happy visits into 5-star Google reviews. A one-star bump is worth 5–9% more revenue.</div></div>

        {(gated || !canSend) ? (
          <UpgradePrompt
            title="Review automation is a Pro feature"
            desc="Automatically text patients a Google-review link after their visit. Higher ratings drive new-patient revenue. Upgrade to Pro to turn it on."
            requiredPlan="Pro"
            onUpgrade={() => navigate("billing")}
          />
        ) : (
          <div className="card" style={{ marginBottom: 20 }}>
            <form className="card-pad" onSubmit={send} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr auto", gap: 10, alignItems: "end" }}>
              <div className="field"><label className="label">Patient name</label><input className="input" value={name} onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="Grace Okafor" /></div>
              <div className="field"><label className="label">Phone</label><input className="input" value={phone} onChange={(e: ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)} placeholder="(512) 555-0123" /></div>
              <Button variant="primary" type="submit" icon="send" loading={busy} disabled={!name}>Send review request</Button>
            </form>
          </div>
        )}

        <div className="card">
          <div className="card-head"><div className="card-title">Recent requests</div></div>
          {status === "loading" && <div className="card-pad"><SkelRows n={3} /></div>}
          {status === "error" && <ErrorState onRetry={load} />}
          {status === "ready" && items.length === 0 && <EmptyState icon="star" title="No requests yet" desc="Sent review requests will appear here." />}
          {status === "ready" && items.map((r) => (
            <div key={r.id} className="lrow" style={{ gap: 13, padding: "13px 18px", borderBottom: "1px solid var(--line)" }}>
              <span className="statcard-ic" style={{ width: 32, height: 32, background: "var(--a-50)", color: "var(--a-700)", flex: "none" }}><Icon name="star" size={16} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                <div className="muted" style={{ fontSize: 12.5 }}>{r.phone || "—"}</div>
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ok-ink)", background: "var(--ok-bg)", padding: "3px 9px", borderRadius: 99 }}>{r.status === "recorded" ? "Sent" : r.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
