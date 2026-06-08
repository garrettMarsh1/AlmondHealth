import { useState, useEffect } from "react";
import { Button, Badge, Segmented, Icon, SkelCards, SkelBlock, ErrorState, EmptyState } from "../ui";
import { api } from "../api";

const RANGES = { "7": "Last 7 days", "30": "Last 30 days", "90": "Last 90 days" };

function BarChart({ data }) {
  const max = Math.max(...data, 1);
  const W = 560, H = 200, pad = 24, bw = (W - pad * 2) / data.length;
  const months = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  return (
    <svg viewBox={`0 0 ${W} ${H + 28}`} style={{ width: "100%", height: "auto" }}>
      {[0, 0.5, 1].map((g) => (
        <line key={g} x1={pad} x2={W - pad} y1={pad + (H - pad) * g} y2={pad + (H - pad) * g} stroke="var(--line)" strokeWidth="1" />
      ))}
      {data.map((v, i) => {
        const h = (v / max) * (H - pad - 8);
        const x = pad + i * bw + bw * 0.18;
        const w = bw * 0.64;
        const y = H - h;
        const last = i === data.length - 1;
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={h} rx="4" fill={last ? "var(--p-500)" : "var(--p-200)"} />
            <text x={x + w / 2} y={H + 18} textAnchor="middle" fontSize="10" fill="var(--ink-muted)" fontFamily="var(--font-mono)">{months[i % months.length]}</text>
            {last && <text x={x + w / 2} y={y - 7} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--p-600)">{v}</text>}
          </g>
        );
      })}
    </svg>
  );
}

export default function Reports() {
  const [range, setRange] = useState("30");
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");

  const load = (r) => {
    setStatus("loading");
    api.reportsOverview(RANGES[r])
      .then((res) => { setData(res); setStatus("ready"); })
      .catch(() => setStatus("error"));
  };
  useEffect(() => { load(range); }, [range]);

  return (
    <div className="content">
      <div className="content-wide">
        <div className="page-head page-head-row">
          <div>
            <h1>Reports &amp; ROI</h1>
            <div className="ph-sub">What Almond brought in — for Dr. Patel. {data ? data.range : RANGES[range]}.</div>
          </div>
          <div className="row">
            <Segmented value={range} onChange={setRange} options={[{ value: "7", label: "7d" }, { value: "30", label: "30d" }, { value: "90", label: "90d" }]} />
            <Button variant="secondary" icon="download">Export PDF</Button>
          </div>
        </div>

        {status === "loading" && (
          <>
            <div style={{ marginBottom: 20 }}><SkelCards n={4} /></div>
            <SkelBlock h={280} />
          </>
        )}

        {status === "error" && <ErrorState onRetry={() => load(range)} />}

        {status === "ready" && (!data || !data.kpis || data.kpis.length === 0) && (
          <EmptyState icon="reports" title="No reporting data yet" desc="Once leads start converting and forms come back, your ROI will show up here." />
        )}

        {status === "ready" && data && data.kpis && data.kpis.length > 0 && (
          <>
            <div className="statgrid" style={{ marginBottom: 20 }}>
              {data.kpis.map((k) => (
                <div className="card card-pad statcard" key={k.label} style={{ cursor: "default" }}>
                  <div className="statcard-top">
                    <span className="statcard-ic" style={k.icon === "dollar" ? { background: "var(--a-50)", color: "var(--a-700)" } : null}><Icon name={k.icon} size={18} /></span>
                    {k.delta && <span className={`statcard-delta ${k.good ? "up" : "down"}`}><Icon name={k.good ? "arrowUp" : "arrowDown"} size={12} />{k.delta}</span>}
                  </div>
                  <div className="statcard-val tnum">{k.value}</div>
                  <div className="statcard-label">{k.label}</div>
                  {k.note && <div className="statcard-hint">{k.note}</div>}
                </div>
              ))}
            </div>

            <div className="grid-dash">
              <div className="card card-pad">
                <div className="between" style={{ marginBottom: 18 }}>
                  <div><div className="card-title">New patients captured</div><div className="muted" style={{ fontSize: 13, marginTop: 2 }}>Monthly, last 12 months</div></div>
                  <Badge tone="ok" icon="trending">+22% vs prior period</Badge>
                </div>
                {data.chart && data.chart.length > 0
                  ? <BarChart data={data.chart} />
                  : <EmptyState icon="trending" title="No trend yet" desc="Not enough history to chart." />}
              </div>

              <div className="stack">
                <div className="card card-pad" style={{ background: "linear-gradient(160deg, var(--p-500), var(--p-700))", color: "#fff", border: "none" }}>
                  <div className="row between">
                    <div className="eyebrow" style={{ color: "rgba(255,255,255,0.7)" }}>Staff time saved</div>
                    <Icon name="clock" size={20} style={{ opacity: 0.8 }} />
                  </div>
                  <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 8 }} className="tnum">{data.time_saved}</div>
                  <div style={{ fontSize: 13.5, opacity: 0.85, marginTop: 4 }}>this month, on intake re-keying &amp; phone tag — about $1,400 of front-desk hours.</div>
                </div>

                <div className="card">
                  <div className="card-head"><div className="card-title" style={{ fontSize: 15 }}>Where revenue came from</div></div>
                  <div>
                    {[["New patients (recovered calls)", "$22,400", 58], ["New patients (web requests)", "$14,800", 38], ["Reactivated / whitening", "$11,000", 28]].map(([label, amt, pct]) => (
                      <div key={label} style={{ padding: "13px 18px", borderBottom: "1px solid var(--line)" }}>
                        <div className="between" style={{ marginBottom: 7 }}><span style={{ fontSize: 13.5, fontWeight: 500 }}>{label}</span><span className="tnum" style={{ fontWeight: 700 }}>{amt}</span></div>
                        <div style={{ height: 7, background: "var(--n-100)", borderRadius: 99 }}><div style={{ width: pct + "%", height: "100%", background: "var(--p-400)", borderRadius: 99 }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="card card-pad" style={{ marginTop: 20 }}>
              <div className="row" style={{ gap: 12 }}>
                <Icon name="info" size={18} style={{ color: "var(--ink-muted)" }} />
                <span className="muted" style={{ fontSize: 13 }}>Revenue impact is an estimate based on your average production per new patient ($590) and recovered call conversion rate. Adjust assumptions in Settings → Reporting.</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
