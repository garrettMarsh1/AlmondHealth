import { useState, useEffect } from "react";
import { Button, Badge, Toggle, EmptyState, ErrorState, SkelCards, SkelBlock, useToast, Icon } from "../ui";
import { useNav } from "../ctx";
import { api } from "../api";
import { DATA } from "../data";

const CAT_TONE = { Intake: "pine", Medical: "apricot", Consent: "neutral" };

const FIELD_PALETTE = [
  { type: "section", label: "Section heading", icon: "type" },
  { type: "text", label: "Text answer", icon: "edit" },
  { type: "choice", label: "Multiple choice", icon: "list" },
  { type: "date", label: "Date", icon: "calendar" },
  { type: "yesno", label: "Yes / No", icon: "check" },
  { type: "signature", label: "Signature", icon: "signature" },
];

const PALETTE_BY_TYPE = Object.fromEntries(FIELD_PALETTE.map((p) => [p.type, p]));

const fieldCount = (t) => (Array.isArray(t.fields) ? t.fields.length : 0);
const normalizeField = (f) => (typeof f === "string" ? { type: "text", label: f, required: false } : { ...f });

function Library({ onEdit }) {
  const { navigate } = useNav();
  const [templates, setTemplates] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [phase, setPhase] = useState("loading");

  const load = () => {
    setPhase("loading");
    Promise.all([api.formTemplates(), api.submissions().catch(() => [])])
      .then(([t, s]) => { setTemplates(t || []); setSubmissions(s || []); setPhase("ready"); })
      .catch(() => setPhase("error"));
  };
  useEffect(() => { load(); }, []);

  const statsFor = (id) => {
    const subs = submissions.filter((s) => s.template_id === id);
    const done = subs.filter((s) => s.status === "completed" || s.status === "in_chart").length;
    return { sent: subs.length, completion: subs.length ? Math.round((done / subs.length) * 100) : 0 };
  };

  return (
    <>
      <div className="page-head page-head-row">
        <div>
          <h1>Forms</h1>
          <div className="ph-sub">Branded intake, medical history &amp; consent forms. Completed forms become a PDF in the patient's chart.</div>
        </div>
        <div className="row">
          <Button variant="secondary" icon="send" onClick={() => navigate("sendform")}>Send a form</Button>
          <Button variant="primary" icon="plus" onClick={() => onEdit("new")}>New form</Button>
        </div>
      </div>

      {phase === "loading" && <SkelCards n={6} />}
      {phase === "error" && <ErrorState onRetry={load} />}
      {phase === "ready" && templates.length === 0 && (
        <EmptyState
          icon="forms"
          title="No forms yet"
          desc="Build a branded intake, medical history, or consent form. Patients fill it on their phone and it lands as a PDF in the chart."
          action={<Button variant="primary" icon="plus" onClick={() => onEdit("new")}>New form</Button>}
        />
      )}
      {phase === "ready" && templates.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }} data-formgrid>
          {templates.map((f) => {
            const { sent, completion } = statsFor(f.id);
            return (
              <div className="card card-hover card-pad" key={f.id} style={{ cursor: "pointer" }} onClick={() => onEdit(f.id)}>
                <div className="between" style={{ marginBottom: 14 }}>
                  <span className="statcard-ic" style={{ background: "var(--p-50)", color: "var(--p-500)" }}><Icon name="forms" size={18} /></span>
                  {f.category && <Badge tone={CAT_TONE[f.category] || "neutral"}>{f.category}</Badge>}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>{f.name}</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>{fieldCount(f)} fields</div>
                <hr className="divider" style={{ margin: "14px 0" }} />
                <div className="between">
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800 }} className="tnum">{completion}%</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>completion</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }} className="tnum">{sent}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>sent</div>
                  </div>
                  <Button variant="ghost" size="sm" iconRight="edit">Edit</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function Builder({ formId, onBack }) {
  const toast = useToast();
  const isNew = formId === "new";
  const [name, setName] = useState(isNew ? "Untitled form" : "");
  const [category, setCategory] = useState(null);
  const [fields, setFields] = useState([]);
  const [selIdx, setSelIdx] = useState(null);
  const [phase, setPhase] = useState(isNew ? "ready" : "loading");
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (isNew) {
      setName("Untitled form");
      setCategory(null);
      setFields([{ type: "section", label: "Patient information", required: false }]);
      setSelIdx(0);
      setPhase("ready");
      return;
    }
    setPhase("loading");
    api.formTemplate(formId)
      .then((t) => {
        setName(t.name || "Untitled form");
        setCategory(t.category || null);
        const fs = (Array.isArray(t.fields) ? t.fields : []).map(normalizeField);
        setFields(fs);
        setSelIdx(fs.length ? 0 : null);
        setPhase("ready");
      })
      .catch(() => setPhase("error"));
  };
  useEffect(() => { load(); }, [formId]);

  const sel = selIdx != null ? fields[selIdx] : null;

  const addField = (type, label) =>
    setFields((f) => {
      const next = [...f, { type, label, required: false, ...(type === "choice" ? { options: ["Option 1", "Option 2"] } : {}) }];
      setSelIdx(next.length - 1);
      return next;
    });
  const removeField = (i) => { setFields((f) => f.filter((_, idx) => idx !== i)); setSelIdx(null); };
  const patchField = (i, patch) => setFields((f) => f.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  const save = async () => {
    setSaving(true);
    const payload = { name, category, fields };
    try {
      if (isNew) await api.createTemplate(payload);
      else await api.updateTemplate(formId, payload);
      toast({ tone: "success", title: "Form saved", desc: "Available to send" });
      onBack();
    } catch {
      toast({ title: "Couldn't save form", desc: "Nothing was lost — try again.", icon: "alertTri" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-head page-head-row">
        <div className="row">
          <Button variant="ghost" icon="chevL" onClick={onBack}>Forms</Button>
          <div>
            <h1 style={{ fontSize: 22 }}>{name || "Untitled form"}</h1>
            <div className="ph-sub">Drag fields in from the left. Patients fill this on their phone.</div>
          </div>
        </div>
        <div className="row">
          <Button variant="secondary" icon="eye">Preview</Button>
          <Button variant="primary" icon="check" loading={saving} onClick={save}>Save form</Button>
        </div>
      </div>

      {phase === "loading" && <SkelBlock h={420} />}
      {phase === "error" && <ErrorState onRetry={load} />}
      {phase === "ready" && (
        <div className="builder">
          <div className="builder-palette">
            <div className="eyebrow" style={{ marginBottom: 12 }}>Field types</div>
            {FIELD_PALETTE.map((p) => (
              <div className="palette-item" key={p.type} draggable onClick={() => addField(p.type, p.label)}>
                <Icon name={p.icon} size={17} className="pi-ic" />
                {p.label}
                <Icon name="plus" size={14} style={{ marginLeft: "auto", color: "var(--ink-muted)" }} />
              </div>
            ))}
            <div className="alert alert-info" style={{ marginTop: 14, fontSize: 12.5, padding: "10px 12px" }}>
              <Icon name="info" className="ic" /><div>Click or drag a field onto the canvas.</div>
            </div>
          </div>

          <div className="builder-canvas">
            <div className="builder-canvas-inner">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 16, borderBottom: "1px solid var(--line)" }}>
                <span style={{ width: 34, height: 34, borderRadius: 8, background: "var(--p-500)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800 }}>B</span>
                <div><div style={{ fontWeight: 700 }}>{DATA.practice.name}</div><div className="muted" style={{ fontSize: 12 }}>{name || "Untitled form"}</div></div>
              </div>
              {fields.map((f, i) => (
                <div key={i} className={`fblock ${f.type === "section" ? "section-block" : ""} ${selIdx === i ? "selected" : ""}`} onClick={() => setSelIdx(i)}>
                  <Icon name="grip" size={15} className="fb-grip" />
                  {f.type === "section"
                    ? <div className="fb-label">{f.label}</div>
                    : (<>
                        <div className="fb-label">{f.label}{f.required && <span className="fb-req">*</span>}</div>
                        {f.type === "text" && <div className="input" style={{ marginTop: 8, color: "var(--n-400)", display: "flex", alignItems: "center" }}>Text answer…</div>}
                        {f.type === "date" && <div className="input" style={{ marginTop: 8, color: "var(--n-400)", display: "flex", alignItems: "center", gap: 8 }}><Icon name="calendar" size={16} />MM / DD / YYYY</div>}
                        {f.type === "choice" && <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>{(f.options || []).map((o, oi) => <div key={oi} className="row" style={{ gap: 8, fontSize: 14 }}><span className="radio" /> {o}</div>)}</div>}
                        {f.type === "yesno" && <div className="row" style={{ marginTop: 8, gap: 8 }}><div className="btn btn-secondary btn-sm">Yes</div><div className="btn btn-secondary btn-sm">No</div></div>}
                        {f.type === "signature" && <div className="sigpad" style={{ marginTop: 8, height: 80 }}><span className="muted row" style={{ gap: 6 }}><Icon name="signature" size={18} />Sign here</span></div>}
                      </>)}
                </div>
              ))}
              <button className="btn btn-ghost btn-block" style={{ borderStyle: "dashed", borderWidth: 1.5, borderColor: "var(--line-strong)", height: 46, color: "var(--ink-soft)" }} onClick={() => addField("text", "New field")}><Icon name="plus" size={16} />Drop a field here</button>
            </div>
          </div>

          <div className="builder-props">
            <div className="eyebrow" style={{ marginBottom: 14 }}>Field settings</div>
            {sel ? (
              <div className="stack" style={{ gap: 16 }}>
                <div className="field"><label className="label">Label</label><input className="input" value={sel.label} onChange={(e) => patchField(selIdx, { label: e.target.value })} /></div>
                <div className="field"><label className="label">Field type</label><div className="row" style={{ gap: 8 }}><Badge tone="pine" icon={(PALETTE_BY_TYPE[sel.type] || {}).icon || "type"}>{sel.type}</Badge></div></div>
                {sel.type !== "section" && (
                  <div className="between"><div><div style={{ fontWeight: 600, fontSize: 14 }}>Required</div><div className="muted" style={{ fontSize: 12 }}>Patient must answer</div></div><Toggle checked={!!sel.required} onChange={(v) => patchField(selIdx, { required: v })} /></div>
                )}
                {sel.type === "choice" && (
                  <div className="field">
                    <label className="label">Options</label>
                    {(sel.options || []).map((o, oi) => (
                      <input key={oi} className="input" style={{ marginBottom: 6 }} value={o} onChange={(e) => patchField(selIdx, { options: sel.options.map((x, xi) => (xi === oi ? e.target.value : x)) })} />
                    ))}
                    <Button variant="ghost" size="sm" icon="plus" onClick={() => patchField(selIdx, { options: [...(sel.options || []), `Option ${(sel.options || []).length + 1}`] })}>Add option</Button>
                  </div>
                )}
                {sel.type === "signature" && (
                  <div className="alert alert-info" style={{ fontSize: 12.5 }}><Icon name="shield" className="ic" /><div>Captured signatures are timestamped and embedded in the chart PDF.</div></div>
                )}
                <hr className="divider" />
                <Button variant="danger-ghost" icon="trash" onClick={() => removeField(selIdx)}>Delete field</Button>
              </div>
            ) : <div className="muted" style={{ fontSize: 13 }}>Select a field to edit its settings.</div>}
          </div>
        </div>
      )}
    </>
  );
}

export default function Forms() {
  const [editing, setEditing] = useState(null);
  return (
    <div className="content">
      <div className="content-wide">
        {editing ? <Builder formId={editing} onBack={() => setEditing(null)} /> : <Library onEdit={setEditing} />}
      </div>
    </div>
  );
}
