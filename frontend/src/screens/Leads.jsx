import { useState, useEffect } from "react";
import { Button, Badge, SyncPill, Avatar, Drawer, Segmented, Checkbox, SortTh, Pagination, useToast, Icon } from "../ui";
import { useNav } from "../ctx";
import { api } from "../api";

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : "");
const STAGE_TONE = { new: "apricot", contacted: "warn", booked: "pine", converted: "ok" };
const STAGE_COLOR = { new: "var(--a-600)", contacted: "var(--warn)", booked: "var(--p-500)", converted: "var(--ok)" };
const SOURCE_IC = { "Missed call": "phoneMissed", "Website request": "external", Referral: "users" };
const STAGES = ["new", "contacted", "booked", "converted"];

function ConvertDrawer({ lead, onClose, onConverted }) {
  const [phase, setPhase] = useState("idle");
  const [patnum, setPatnum] = useState(null);
  useEffect(() => { setPhase("idle"); setPatnum(null); }, [lead && lead.id]);
  if (!lead) return null;

  const convert = async () => {
    setPhase("syncing");
    try {
      const res = await api.convertLead(lead.id);
      setPatnum(res.patient.id);
      setPhase("done");
      onConverted(res.patient);
    } catch {
      setPhase("failed");
    }
  };

  return (
    <Drawer open={!!lead} onClose={onClose} width={480}>
      <div className="drawer-head between">
        <div className="row"><Avatar name={lead.name} size="lg" /><div><div style={{ fontSize: 19, fontWeight: 800 }}>{lead.name}</div><div className="muted" style={{ fontSize: 13 }}>{lead.phone}</div></div></div>
        <button className="btn-icon" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
      </div>
      <div className="drawer-body">
        <div className="row" style={{ gap: 8, marginBottom: 18 }}>
          <Badge tone={STAGE_TONE[lead.stage]} dot>{cap(lead.stage)}</Badge>
          <Badge tone="neutral" icon={SOURCE_IC[lead.source] || "external"}>{lead.source}</Badge>
        </div>
        <div className="stack" style={{ gap: 14 }}>
          <div><div className="eyebrow" style={{ marginBottom: 8 }}>Reason for visit</div><div style={{ fontSize: 15, fontWeight: 500 }}>{lead.reason}</div></div>
          <hr className="divider" />
          <div><div className="eyebrow" style={{ marginBottom: 5 }}>Est. value</div><div style={{ fontWeight: 700, color: "var(--p-600)" }}>${(lead.est_value || 0).toLocaleString()}</div></div>
        </div>
        {phase === "done" && (
          <div className="alert alert-ok" style={{ marginTop: 18 }}>
            <Icon name="checkCircle" className="ic" />
            <div><strong>Patient created in Open Dental.</strong><br />Chart PatNum #{patnum} created — live in the PMS.</div>
          </div>
        )}
        {phase === "failed" && (
          <div className="alert alert-info" style={{ marginTop: 18 }}>
            <Icon name="alertTri" className="ic" /><div>Couldn't reach Open Dental. Nothing was lost — try again.</div>
          </div>
        )}
      </div>
      <div className="drawer-foot" style={{ flexDirection: "column", gap: 12, alignItems: "stretch" }}>
        {phase === "syncing" && <div style={{ alignSelf: "center" }}><SyncPill state="syncing" target="Open Dental" /></div>}
        {phase === "done" && <div style={{ alignSelf: "center" }}><SyncPill state="saved" target="Open Dental" time="just now" /></div>}
        <div className="row" style={{ gap: 10 }}>
          <Button variant="secondary" icon="message" style={{ flex: 1 }}>Message</Button>
          {phase === "done"
            ? <Button variant="primary" icon="check" style={{ flex: 2 }} onClick={onClose}>Done</Button>
            : <Button variant="primary" icon="userPlus" loading={phase === "syncing"} style={{ flex: 2 }} onClick={convert}>{phase === "syncing" ? "Creating in Open Dental…" : "Convert to patient in Open Dental"}</Button>}
        </div>
      </div>
    </Drawer>
  );
}

export default function Leads() {
  const { params } = useNav();
  const [view, setView] = useState("list");
  const [leads, setLeads] = useState([]);
  const [selected, setSelected] = useState(params.leadId || null);
  const [checked, setChecked] = useState([]);
  const [sort, setSort] = useState({ field: "name", dir: "asc" });
  const toast = useToast();

  const load = () => api.leads().then(setLeads).catch(() => {});
  useEffect(() => { load(); }, []);

  const lead = leads.find((l) => l.id === selected);
  const doSort = (f) => setSort((s) => ({ field: f, dir: s.field === f && s.dir === "asc" ? "desc" : "asc" }));
  const ORDER = { new: 0, contacted: 1, booked: 2, converted: 3 };
  const sorted = [...leads].sort((a, b) => {
    let av = a[sort.field], bv = b[sort.field];
    if (sort.field === "stage") { av = ORDER[a.stage]; bv = ORDER[b.stage]; }
    if (sort.field === "value") { av = a.est_value || 0; bv = b.est_value || 0; }
    if (av < bv) return sort.dir === "asc" ? -1 : 1;
    if (av > bv) return sort.dir === "asc" ? 1 : -1;
    return 0;
  });
  const toggleCheck = (id) => setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  return (
    <div className="content"><div className="content-wide">
      <div className="page-head page-head-row">
        <div><h1>Leads &amp; calls</h1><div className="ph-sub">Every missed call, web request, and walk-in — one place. Convert to a patient in one click. <strong>Live to Open Dental.</strong></div></div>
        <div className="row">
          <Segmented value={view} onChange={setView} options={[{ value: "list", label: "List", icon: "list" }, { value: "kanban", label: "Pipeline", icon: "kanban" }]} />
          <Button variant="primary" icon="plus">New lead</Button>
        </div>
      </div>

      {view === "list" ? (
        <div className="card" style={{ overflow: "hidden" }}>
          <table className="tbl">
            <thead><tr>
              <th style={{ width: 36 }}></th>
              <SortTh label="Lead" field="name" sort={sort} onSort={doSort} />
              <th>Source</th><th>Reason</th>
              <SortTh label="Stage" field="stage" sort={sort} onSort={doSort} />
              <SortTh label="Est. value" field="value" sort={sort} onSort={doSort} />
              <th></th>
            </tr></thead>
            <tbody>
              {sorted.map((l) => (
                <tr key={l.id} className={checked.includes(l.id) ? "selected" : ""} onClick={() => setSelected(l.id)} style={{ cursor: "pointer" }}>
                  <td onClick={(e) => e.stopPropagation()}><Checkbox checked={checked.includes(l.id)} onChange={() => toggleCheck(l.id)} /></td>
                  <td><div className="row" style={{ gap: 10 }}><Avatar name={l.name} size="sm" /><div><div style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{l.name}</div><div className="muted mono" style={{ fontSize: 12 }}>{l.phone}</div></div></div></td>
                  <td><span className="row" style={{ gap: 6 }}><Icon name={SOURCE_IC[l.source] || "external"} size={15} style={{ color: "var(--ink-muted)" }} />{l.source}</span></td>
                  <td className="muted">{l.reason}</td>
                  <td><Badge tone={STAGE_TONE[l.stage]} dot>{cap(l.stage)}</Badge></td>
                  <td className="tnum" style={{ fontWeight: 600 }}>${(l.est_value || 0).toLocaleString()}</td>
                  <td><Icon name="chevR" size={16} style={{ color: "var(--ink-muted)" }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={1} label={`${leads.length} leads · live from /v1/leads`} />
        </div>
      ) : (
        <div className="kanban">
          {STAGES.map((stage) => {
            const items = leads.filter((l) => l.stage === stage);
            return (
              <div className="kcol" key={stage}>
                <div className="kcol-head"><div className="kc-title"><span className="stage-dot" style={{ background: STAGE_COLOR[stage] }} />{cap(stage)}</div><span className="kc-count">{items.length}</span></div>
                {items.map((l) => (
                  <div className="kcard" key={l.id} onClick={() => setSelected(l.id)}>
                    <div className="between" style={{ marginBottom: 5 }}><div className="kc-name">{l.name}</div><Icon name="grip" size={15} style={{ color: "var(--n-300)" }} /></div>
                    <div className="kc-reason">{l.reason}</div>
                    <div className="kc-foot"><span className="row" style={{ gap: 5, fontSize: 11.5, color: "var(--ink-muted)" }}><Icon name={SOURCE_IC[l.source] || "external"} size={13} />{l.source}</span><span className="tnum" style={{ fontSize: 12, fontWeight: 700, color: "var(--p-600)" }}>${(l.est_value || 0).toLocaleString()}</span></div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
    <ConvertDrawer
      lead={lead}
      onClose={() => setSelected(null)}
      onConverted={(p) => { toast({ tone: "success", title: `${lead ? lead.name : "Lead"} is now a patient`, desc: `Saved to Open Dental · PatNum ${p.id}` }); load(); }}
    />
    </div>
  );
}
