import { useState, useEffect } from "react";
import { Button, Icon, UsageMeter, SkelCards, SkelBlock, ErrorState, useToast } from "../ui";
import { api } from "../api";
import { setEntitlements } from "../entitlements";
import type { BillingPlan, BillingPlanInfo, UsageOverview } from "../types";

type Status = "loading" | "ready" | "error";

const RANK: Record<string, number> = { core: 0, pro: 1, practice_plus: 2 };

const FEATURE_LABELS: Record<string, string> = {
  waitlist_autofill: "Cancellation & waitlist auto-fill",
  review_automation: "Reputation & Google-review automation",
  advanced_analytics: "Advanced analytics & attribution",
  ai_voice: "AI voice receptionist",
  payments_text_to_pay: "Text-to-pay patient payments",
  insurance_eligibility: "Insurance eligibility verification",
  multi_location: "Multi-location & DSO",
  governance_audit: "Governance, SSO & audit",
};

const CORE_LOOP = [
  "Lead & missed-call capture",
  "Online self-scheduling",
  "Digital intake → PDF to chart",
  "Two-way patient messaging",
  "ROI dashboard",
];

const PRO_KEYS = ["waitlist_autofill", "review_automation", "advanced_analytics"];

export default function Billing() {
  const toast = useToast();
  const [current, setCurrent] = useState<BillingPlan | null>(null);
  const [plans, setPlans] = useState<BillingPlanInfo[]>([]);
  const [usage, setUsage] = useState<UsageOverview | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    setStatus("loading");
    Promise.all([api.billingPlan(), api.billingPlans(), api.usage()])
      .then(([c, p, u]) => { setCurrent(c); setPlans(p); setUsage(u); setStatus("ready"); })
      .catch(() => setStatus("error"));
  };
  useEffect(() => { load(); }, []);

  const choose = async (plan: string) => {
    if (busy || !current || plan === current.plan) return;
    setBusy(plan);
    try {
      if (current.stripe_configured) {
        const res = await api.billingCheckout(plan);
        if (res.url) { window.location.href = res.url; return; }
        toast({ tone: "success", title: "Checkout started", desc: res.note || "", icon: "checkCircle" });
        setBusy(null);
        return;
      }
      const res = await api.billingDevSetPlan(plan);
      setEntitlements(res.entitlements);
      toast({ tone: "success", title: `You're on ${res.plan}`, desc: "Features unlocked", icon: "checkCircle" });
      setTimeout(() => window.location.reload(), 600);
    } catch {
      toast({ tone: "error", title: "Couldn't change plan", desc: "Please try again", icon: "alertTri" });
      setBusy(null);
    }
  };

  const atCap = usage ? usage.meters.some((m) => m.included > 0 && m.used >= m.included) : false;

  return (
    <div className="content">
      <div className="content-wide">
        <div className="page-head"><h1>Plan &amp; billing</h1><div className="ph-sub">Your subscription, usage, and what unlocks at each tier. Priced per location.</div></div>

        {status === "loading" && <><div style={{ marginBottom: 20 }}><SkelCards n={3} /></div><SkelBlock h={180} /></>}
        {status === "error" && <ErrorState onRetry={load} />}

        {status === "ready" && current && (
          <>
            <div className="card card-pad" style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div className="eyebrow">Current plan</div>
                <div className="row" style={{ gap: 10, marginTop: 4, alignItems: "baseline" }}>
                  <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", textTransform: "capitalize" }}>{current.plan.replace("_", " ")}</span>
                  <span className="tnum muted" style={{ fontSize: 15 }}>${current.price_monthly}/location · mo</span>
                  {!current.stripe_configured && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--a-700)", background: "var(--a-50)", padding: "3px 9px", borderRadius: 99 }}>demo mode</span>}
                </div>
              </div>
              <div className="muted" style={{ fontSize: 13 }}>{current.location_count} location{current.location_count === 1 ? "" : "s"}</div>
            </div>

            {usage && usage.meters.length > 0 && (
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-head between">
                  <div className="card-title">Usage this period · {usage.period}</div>
                  {atCap && <span style={{ fontSize: 12, fontWeight: 700, color: "var(--danger)", background: "var(--danger-bg)", padding: "3px 9px", borderRadius: 99 }}>At limit</span>}
                </div>
                <div className="card-pad" style={{ paddingTop: 4 }}>
                  {usage.meters.map((m) => <UsageMeter key={m.key} label={m.label} used={m.used} included={m.included} />)}
                  {atCap && current.plan !== "practice_plus" && (
                    <Button variant="primary" icon="zap" style={{ marginTop: 12 }} loading={busy !== null} onClick={() => choose(current.plan === "core" ? "pro" : "practice_plus")}>Add capacity — upgrade</Button>
                  )}
                </div>
              </div>
            )}

            <div className="statgrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
              {plans.map((p) => {
                const isCurrent = p.plan === current.plan;
                const up = (RANK[p.plan] ?? 0) > (RANK[current.plan] ?? 0);
                const extras = p.features.filter((f) => p.plan === "pro" || !PRO_KEYS.includes(f));
                return (
                  <div key={p.plan} className="card card-pad" style={{ position: "relative", border: p.recommended ? "1.5px solid var(--p-400)" : undefined }}>
                    {p.recommended && <span style={{ position: "absolute", top: 14, right: 14, fontSize: 11, fontWeight: 700, color: "var(--a-700)", background: "var(--a-50)", padding: "3px 9px", borderRadius: 99 }}>Most popular</span>}
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{p.name}</div>
                    <div className="row" style={{ alignItems: "baseline", gap: 4, margin: "6px 0 10px" }}>
                      <span className="tnum" style={{ fontSize: 30, fontWeight: 800 }}>${p.price_monthly}</span>
                      <span className="muted" style={{ fontSize: 13 }}>/location · mo{p.plan === "practice_plus" ? "+" : ""}</span>
                    </div>
                    <p className="muted" style={{ fontSize: 13, lineHeight: 1.5, minHeight: 56 }}>{p.blurb}</p>
                    <div className="stack" style={{ gap: 8, margin: "12px 0 16px" }}>
                      {p.plan === "core"
                        ? CORE_LOOP.map((f) => <div key={f} className="row" style={{ gap: 8, fontSize: 13 }}><Icon name="check" size={15} style={{ color: "var(--ok-ink)", flex: "none" }} />{f}</div>)
                        : <>
                            <div className="row" style={{ gap: 8, fontSize: 13, fontWeight: 600 }}><Icon name="check" size={15} style={{ color: "var(--ok-ink)", flex: "none" }} />Everything in {p.plan === "pro" ? "Core" : "Pro"}, plus:</div>
                            {extras.map((f) => <div key={f} className="row" style={{ gap: 8, fontSize: 13 }}><Icon name="check" size={15} style={{ color: "var(--ok-ink)", flex: "none" }} />{FEATURE_LABELS[f] || f}</div>)}
                          </>}
                    </div>
                    {isCurrent
                      ? <Button variant="secondary" className="btn-block" disabled>Current plan</Button>
                      : <Button variant={p.recommended ? "primary" : "secondary"} className="btn-block" loading={busy === p.plan} icon={up ? "arrowUp" : undefined} onClick={() => choose(p.plan)}>{up ? `Upgrade to ${p.name}` : `Switch to ${p.name}`}</Button>}
                  </div>
                );
              })}
            </div>

            {!current.stripe_configured && (
              <div className="card card-pad" style={{ marginTop: 20 }}>
                <div className="row" style={{ gap: 12 }}><Icon name="info" size={18} style={{ color: "var(--ink-muted)", flex: "none" }} /><span className="muted" style={{ fontSize: 13 }}>Demo mode: switching plans here flips entitlements instantly so you can see the sliding scale. With <span className="mono">ALMOND_STRIPE_*</span> keys set, this routes through Stripe Checkout instead.</span></div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
