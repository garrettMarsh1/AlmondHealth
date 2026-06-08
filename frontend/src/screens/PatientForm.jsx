import { useState, useEffect } from "react";
import { Icon, SkelBlock, ErrorState, EmptyState } from "../ui";
import { api } from "../api";

const tokenFromHash = () => {
  const h = (location.hash || "").replace(/^#/, "");
  const m = h.match(/^p\/form\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : "";
};

const normalizeField = (f) =>
  typeof f === "string"
    ? { type: "text", label: f, required: false, options: [] }
    : { type: f.type || "text", label: f.label || "", required: !!f.required, options: f.options || [] };

const firstName = (s) => (s ? s.trim().split(/\s+/)[0] : "");

function StatusBar() {
  return (
    <div className="phone-status">
      <span>9:41</span>
      <span className="row" style={{ gap: 5 }}><Icon name="sync" size={13} /><Icon name="message" size={13} /><span style={{ fontWeight: 700 }}>87%</span></span>
    </div>
  );
}

export default function PatientForm() {
  const [token, setToken] = useState(tokenFromHash);
  const [data, setData] = useState(null);
  const [phase, setPhase] = useState("loading");
  const [i, setI] = useState(0);
  const [val, setVal] = useState({});
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const onHash = () => setToken(tokenFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const load = () => {
    if (!token) { setPhase("empty"); return; }
    setPhase("loading");
    api.publicForm(token)
      .then((d) => { setData(d); setPhase(d.status === "completed" || d.status === "in_chart" ? "already" : "ready"); })
      .catch(() => setPhase("error"));
  };
  useEffect(() => { setI(0); setVal({}); setSignature(""); setResult(null); load(); }, [token]);

  if (phase === "loading") {
    return (
      <div className="phone">
        <div className="phone-notch" />
        <div className="phone-screen">
          <StatusBar />
          <div className="pat-header"><div className="row" style={{ gap: 10 }}><span className="pat-logo" /><div style={{ width: 120 }}><SkelBlock h={16} /></div></div></div>
          <div className="pt-scroll"><div className="pat-body"><SkelBlock h={26} /><div style={{ height: 14 }} /><SkelBlock h={120} /></div></div>
        </div>
      </div>
    );
  }

  if (phase === "empty" || (phase !== "loading" && !token)) {
    return (
      <div className="phone">
        <div className="phone-notch" />
        <div className="phone-screen">
          <StatusBar />
          <div className="pt-scroll"><div className="pat-body" style={{ paddingTop: 40 }}>
            <EmptyState icon="link" title="No form link" desc="Open the secure link your dental office texted you to start your forms." />
          </div></div>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="phone">
        <div className="phone-notch" />
        <div className="phone-screen">
          <StatusBar />
          <div className="pt-scroll"><div className="pat-body" style={{ paddingTop: 40 }}>
            <ErrorState title="Couldn’t open this form" desc="This link may have expired or already been used. Your office can text you a fresh one." onRetry={load} />
          </div></div>
        </div>
      </div>
    );
  }

  const practice = data.practice || {};
  const form = data.form || {};
  const logo = (practice.name || "B").trim()[0] || "B";
  const fields = (form.fields || []).map(normalizeField).filter((f) => f.type !== "section" && f.type !== "signature");
  const hasSignature = (form.fields || []).map(normalizeField).some((f) => f.type === "signature");
  const greetName = firstName(val[fields.findIndex((f) => /name/i.test(f.label))] ?? "");

  const STEPS = [
    { type: "intro" },
    ...fields.map((f, idx) => ({ type: "field", field: f, idx })),
    ...(hasSignature ? [{ type: "sign" }] : []),
    { type: "done" },
  ];
  const cur = STEPS[i];
  const pct = (i / (STEPS.length - 1)) * 100;
  const set = (k, v) => setVal((x) => ({ ...x, [k]: v }));

  const submit = async () => {
    setSubmitting(true);
    try {
      const answers = {};
      fields.forEach((f, idx) => { if (val[idx] != null && val[idx] !== "") answers[f.label] = val[idx]; });
      if (hasSignature) {
        const sigField = (form.fields || []).map(normalizeField).find((f) => f.type === "signature");
        answers[(sigField && sigField.label) || "Signature"] = `signed ${new Date().toISOString().slice(0, 10)}`;
      }
      const res = await api.submitPublicForm(token, answers);
      setResult(res);
      setI(STEPS.length - 1);
    } catch {
      setPhase("error");
    } finally {
      setSubmitting(false);
    }
  };

  const advance = () => {
    if (cur.type === "intro") { setI(i + 1); return; }
    if (cur.type === "field") { setI(i + 1); return; }
    if (cur.type === "sign") { submit(); return; }
  };

  const fieldComplete = cur.type === "field" && (!cur.field.required || (val[cur.idx] != null && String(val[cur.idx]).trim() !== ""));
  const blocked =
    (cur.type === "sign" && !signature) ||
    (cur.type === "field" && !fieldComplete) ||
    submitting;

  const renderField = (f, idx) => {
    if (f.type === "choice" || f.type === "yesno") {
      const opts = f.type === "yesno" ? ["Yes", "No"] : (f.options && f.options.length ? f.options : ["Yes", "No"]);
      return opts.map((o) => (
        <div key={o} className={`pat-opt ${val[idx] === o ? "sel" : ""}`} onClick={() => set(idx, o)}>
          <span className="radio" aria-checked={val[idx] === o} style={val[idx] === o ? { borderColor: "var(--p-500)", borderWidth: 6.5 } : {}} />{o}
        </div>
      ));
    }
    if (f.type === "date") {
      return <input className="pat-input" type="date" value={val[idx] || ""} onChange={(e) => set(idx, e.target.value)} autoFocus />;
    }
    return <input className="pat-input" placeholder="Type your answer" value={val[idx] || ""} onChange={(e) => set(idx, e.target.value)} autoFocus />;
  };

  const showHeaderMeta = i > 0 && cur.type !== "done";

  return (
    <div className="phone">
      <div className="phone-notch" />
      <div className="phone-screen">
        <StatusBar />
        <div className="pat-header">
          <div className="row between">
            <div className="row" style={{ gap: 10 }}>
              <span className="pat-logo">{logo}</span>
              <div><div style={{ fontWeight: 700, fontSize: 15 }}>{practice.name}</div><div style={{ fontSize: 12, opacity: 0.8 }}>{form.name || "Patient Intake"}</div></div>
            </div>
            {showHeaderMeta && <Icon name="lock" size={16} style={{ opacity: 0.8 }} />}
          </div>
          {showHeaderMeta && <div className="pat-progress"><span style={{ width: pct + "%" }} /></div>}
        </div>

        <div className="pt-scroll">
          <div className="pat-body">
            {cur.type === "intro" && (
              <div style={{ textAlign: "center", paddingTop: 20 }}>
                <span style={{ width: 64, height: 64, borderRadius: 18, background: "var(--p-50)", color: "var(--p-500)", display: "inline-grid", placeItems: "center", marginBottom: 18 }}><Icon name="forms" size={30} /></span>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.01em", marginBottom: 8 }}>Welcome 👋</div>
                <p style={{ fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.5, marginBottom: 8 }}>This only takes a few minutes. Your answers go straight to {practice.name}.</p>
                <div className="row" style={{ gap: 8, justifyContent: "center", fontSize: 12.5, color: "var(--ink-muted)", marginTop: 14 }}><Icon name="shield" size={14} />Secure &amp; private · HIPAA protected</div>
                {practice.phone && <div className="row" style={{ gap: 8, justifyContent: "center", fontSize: 12.5, color: "var(--ink-muted)", marginTop: 8 }}><Icon name="phone" size={14} />{practice.phone}{practice.location ? ` · ${practice.location}` : ""}</div>}
              </div>
            )}

            {cur.type === "field" && (
              <div className="pat-q">
                <div className="pq-label">{cur.field.label}{cur.field.required && <span style={{ color: "var(--p-500)" }}> *</span>}</div>
                <div className="pq-hint">{cur.field.required ? "This one’s required." : "Tap to answer."}</div>
                {renderField(cur.field, cur.idx)}
              </div>
            )}

            {cur.type === "sign" && (
              <div className="pat-q">
                <div className="pq-label">Your signature</div>
                <div className="pq-hint">Sign with your finger to consent to treatment &amp; our HIPAA policy.</div>
                <div className="sigpad" onClick={() => setSignature(greetName || "Signed")}>
                  {signature ? <span style={{ fontFamily: "cursive", fontSize: 30, color: "var(--ink)" }}>{signature}</span> : <span className="muted row" style={{ gap: 8 }}><Icon name="signature" size={20} />Tap to sign</span>}
                </div>
                {signature && <button onClick={() => setSignature("")} style={{ fontSize: 13, color: "var(--p-600)", fontWeight: 600, marginTop: 10 }}>Clear &amp; re-sign</button>}
              </div>
            )}

            {cur.type === "done" && (
              <div style={{ textAlign: "center", paddingTop: 30 }}>
                <span style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--ok-bg)", color: "var(--ok)", display: "inline-grid", placeItems: "center", marginBottom: 20 }}><Icon name="check" size={38} strokeWidth={3} /></span>
                <div style={{ fontSize: 23, fontWeight: 800, marginBottom: 10 }}>All done!</div>
                <p style={{ fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.5 }}>{greetName ? `Thanks, ${greetName}. ` : "Thank you. "}Your forms are submitted and the team at {practice.name} has everything they need for your visit.</p>
                <div className="card card-pad" style={{ marginTop: 22, textAlign: "left", background: "var(--n-25)" }}>
                  <div className="row" style={{ gap: 10 }}>
                    <Icon name={result && result.document_id ? "shield" : "checkCircle"} size={18} style={{ color: "var(--ok)" }} />
                    <div>
                      <div style={{ fontWeight: 700 }}>{result && result.document_id ? "Saved to your chart" : "Submitted"}</div>
                      <div className="muted" style={{ fontSize: 13 }}>{result && result.document_id ? `${form.name || "Form"} · written to ${practice.pms || "your chart"}` : `${form.name || "Form"} · received`}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {phase === "already" && cur.type !== "done" && (
          <div className="pat-foot">
            <div className="alert alert-ok"><Icon name="checkCircle" className="ic" /><div>You’ve already completed this form. Nothing more to do.</div></div>
          </div>
        )}
        {phase !== "already" && cur.type !== "done" && (
          <div className="pat-foot">
            <button className="btn btn-primary btn-lg btn-block" onClick={advance} disabled={blocked}>
              {submitting && <span className="spinner" />}
              {cur.type === "intro" ? "Start" : cur.type === "sign" ? (submitting ? "Submitting…" : "Submit forms") : "Continue"}
              {!submitting && <Icon name="arrowRight" className="ic" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
