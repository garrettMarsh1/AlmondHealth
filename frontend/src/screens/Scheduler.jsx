import { useState, useEffect, useMemo } from "react";
import { Button, Badge, SyncPill, Segmented, Modal, Toggle, useToast, Icon, SkelBlock, ErrorState, EmptyState } from "../ui";
import { api } from "../api";

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16];
const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const fmtHr = (h) => (h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`);
const TONE = { confirmed: "appt-confirmed", scheduled: "appt-confirmed", unconfirmed: "appt-unconfirmed", arrived: "appt-arrived" };
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : "");

const iso = (d) => d.toISOString().slice(0, 10);
const startOfWeek = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
};
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const decimalHour = (d) => d.getHours() + d.getMinutes() / 60;
const durationMin = (a) => {
  if (a.end) {
    const ms = new Date(a.end) - new Date(a.start);
    if (ms > 0) return Math.round(ms / 60000);
  }
  return 60;
};
const status = (a) => (a.status || "confirmed").toLowerCase();
const timeLabel = (d) => {
  const hr = d.getHours();
  const min = d.getMinutes();
  return `${hr % 12 === 0 ? 12 : hr % 12}:${min.toString().padStart(2, "0")} ${hr >= 12 ? "PM" : "AM"}`;
};
const slotLabel = (s) => timeLabel(new Date(s.start));

function ApptModal({ appt, onClose, onChanged, providers = [], operatories = [] }) {
  const toast = useToast();
  if (!appt) return null;
  const start = new Date(appt.start);
  const st = status(appt);
  const toneMap = { confirmed: "ok", scheduled: "ok", arrived: "apricot", unconfirmed: "warn" };
  const provider = providers.find((p) => p.id === appt.provider_id);
  const operatory = operatories.find((o) => o.id === appt.operatory_id);
  const providerLabel = provider ? (provider.name || provider.abbr || provider.id) : appt.provider_id ? `Provider ${appt.provider_id}` : "—";
  const operatoryLabel = operatory ? (operatory.name || operatory.id) : appt.operatory_id ? `Op ${appt.operatory_id}` : "—";
  return (
    <Modal open onClose={onClose} title={appt.patient_name || `Patient #${appt.patient_id}`} width={440} footer={
      <>
        <Button variant="danger-ghost" icon="x" onClick={() => { toast({ title: "Appointment cancelled", desc: "Removed from Open Dental", icon: "check" }); onChanged && onChanged(); onClose(); }}>Cancel appt</Button>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" icon="message">Text patient</Button>
        {st === "unconfirmed"
          ? <Button variant="primary" icon="check" onClick={() => { toast({ tone: "success", title: "Confirmed & synced", desc: "Saved to Open Dental" }); onChanged && onChanged(); onClose(); }}>Confirm</Button>
          : <Button variant="primary" icon="check">Check in</Button>}
      </>
    }>
      <div className="stack" style={{ gap: 14 }}>
        <div className="row" style={{ gap: 8 }}>
          <Badge tone={toneMap[st] || "warn"} dot>{cap(st)}</Badge>
          <SyncPill state="saved" target="Open Dental" time="synced" />
        </div>
        <div className="grid2" style={{ gap: 14 }}>
          <div><div className="eyebrow" style={{ marginBottom: 5 }}>Time</div><div style={{ fontWeight: 600 }}>{timeLabel(start)} · {durationMin(appt)} min</div></div>
          <div><div className="eyebrow" style={{ marginBottom: 5 }}>Type</div><div style={{ fontWeight: 600 }}>{appt.reason || "Appointment"}</div></div>
          <div><div className="eyebrow" style={{ marginBottom: 5 }}>Provider</div><div style={{ fontWeight: 600 }}>{providerLabel}</div></div>
          <div><div className="eyebrow" style={{ marginBottom: 5 }}>Operatory</div><div style={{ fontWeight: 600 }}>{operatoryLabel}</div></div>
        </div>
      </div>
    </Modal>
  );
}

function AvailModal({ open, onClose }) {
  const [days, setDays] = useState({ Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: false, Sun: false });
  return (
    <Modal open={open} onClose={onClose} title="Online booking availability" width={520}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" icon="check" onClick={onClose}>Save availability</Button></>}>
      <div className="alert alert-info" style={{ marginBottom: 18 }}>
        <Icon name="info" className="ic" />
        <div>Patients can self-book only into these windows. New bookings write straight into Open Dental.</div>
      </div>
      <div className="stack" style={{ gap: 2 }}>
        {Object.keys(days).map((d) => (
          <div key={d} className="between" style={{ padding: "11px 4px", borderBottom: "1px solid var(--line)" }}>
            <div className="row" style={{ gap: 12 }}>
              <Toggle checked={days[d]} onChange={(v) => setDays((x) => ({ ...x, [d]: v }))} />
              <strong style={{ width: 44 }}>{d}</strong>
            </div>
            {days[d]
              ? <div className="row" style={{ gap: 8 }}><span className="kbd">8:00 AM</span><span className="muted">to</span><span className="kbd">5:00 PM</span></div>
              : <span className="muted" style={{ fontSize: 13 }}>Closed</span>}
          </div>
        ))}
      </div>
    </Modal>
  );
}

function BookModal({ open, onClose, slots, patients, providers, operatories, onBooked }) {
  const toast = useToast();
  const [slot, setSlot] = useState("");
  const [patient, setPatient] = useState("");
  const [operatory, setOperatory] = useState("");
  const [provider, setProvider] = useState("");
  const [reason, setReason] = useState("");
  const [phase, setPhase] = useState("idle");

  useEffect(() => {
    if (!open) return;
    setSlot(slots[0] ? String(0) : "");
    setPatient("");
    setOperatory(operatories[0]?.id || "");
    setProvider(providers[0]?.id || "");
    setReason("");
    setPhase("idle");
  }, [open]);

  const chosen = slot !== "" ? slots[Number(slot)] : null;
  const canBook = chosen && patient;

  const book = async () => {
    if (!canBook) return;
    setPhase("syncing");
    try {
      await api.bookAppointment({
        patient_id: patient,
        start: chosen.start,
        operatory_id: operatory || chosen.operatory_id,
        provider_id: provider || chosen.provider_id,
        reason: reason || undefined,
      });
      setPhase("done");
      toast({ tone: "success", title: "Appointment booked", desc: "Saved to Open Dental" });
      onBooked();
      onClose();
    } catch {
      setPhase("failed");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New appointment" width={520}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        {phase === "syncing" && <SyncPill state="syncing" target="Open Dental" />}
        {phase === "failed" && <SyncPill state="failed" target="Open Dental" onRetry={book} />}
        <div style={{ flex: 1 }} />
        <Button variant="primary" icon="check" loading={phase === "syncing"} disabled={!canBook} onClick={book}>Book into Open Dental</Button>
      </>}>
      <div className="alert alert-info" style={{ marginBottom: 18 }}>
        <Icon name="info" className="ic" />
        <div>Pick an open slot from live availability. Booking writes straight into Open Dental.</div>
      </div>
      <div className="stack" style={{ gap: 14 }}>
        <div className="field">
          <label className="label">Open slot (live availability)</label>
          <select className="input" value={slot} onChange={(e) => setSlot(e.target.value)}>
            <option value="">Select a slot…</option>
            {slots.map((s, i) => <option key={i} value={i}>{new Date(s.start).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} · {slotLabel(s)}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="label">Patient (live from Open Dental)</label>
          <select className="input" value={patient} onChange={(e) => setPatient(e.target.value)}>
            <option value="">Select a patient…</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.first} {p.last} · #{p.id}</option>)}
          </select>
        </div>
        <div className="grid2" style={{ gap: 14 }}>
          <div className="field">
            <label className="label">Provider</label>
            <select className="input" value={provider} onChange={(e) => setProvider(e.target.value)}>
              {providers.map((p) => <option key={p.id} value={p.id}>{p.name || p.abbr || p.id}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label">Operatory</label>
            <select className="input" value={operatory} onChange={(e) => setOperatory(e.target.value)}>
              {operatories.map((o) => <option key={o.id} value={o.id}>{o.name || o.id}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label className="label">Reason</label>
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Cleaning + exam" />
        </div>
      </div>
    </Modal>
  );
}

export default function Scheduler() {
  const [view, setView] = useState("week");
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));
  const [active, setActive] = useState(null);
  const [showAvail, setShowAvail] = useState(false);
  const [showBook, setShowBook] = useState(false);

  const [appts, setAppts] = useState([]);
  const [slots, setSlots] = useState([]);
  const [patients, setPatients] = useState([]);
  const [providers, setProviders] = useState([]);
  const [operatories, setOperatories] = useState([]);
  const [phase, setPhase] = useState("loading");

  const today = useMemo(() => new Date(), []);
  const weekDays = useMemo(() => Array.from({ length: 5 }, (_, i) => addDays(anchor, i)), [anchor]);
  const visibleDays = view === "week" ? weekDays : [weekDays.find((d) => sameDay(d, today)) || weekDays[0]];

  const rangeStart = visibleDays[0];
  const rangeEnd = visibleDays[visibleDays.length - 1];

  const load = () => {
    setPhase("loading");
    const start = iso(rangeStart);
    const end = iso(addDays(rangeEnd, 1));
    Promise.all([
      api.appointmentsRange(start, end),
      api.availability(start, end, 60).catch(() => []),
    ])
      .then(([a, s]) => { setAppts(a || []); setSlots(s || []); setPhase("ready"); })
      .catch(() => setPhase("error"));
  };

  useEffect(() => { load(); }, [anchor, view]);
  useEffect(() => {
    api.patients({ last: "" }).then((p) => setPatients((p || []).slice(0, 25))).catch(() => {});
    api.providers().then((p) => setProviders(p || [])).catch(() => {});
    api.operatories().then((o) => setOperatories(o || [])).catch(() => {});
  }, []);

  const apptsForDay = (d) => appts.filter((a) => sameDay(new Date(a.start), d));
  const slotsForDay = (d) => slots.filter((s) => sameDay(new Date(s.start), d));

  const rangeLabel = sameDay(rangeStart, rangeEnd)
    ? rangeStart.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
    : `${rangeStart.toLocaleDateString([], { month: "short", day: "numeric" })} – ${rangeEnd.toLocaleDateString([], { day: "numeric", year: "numeric" })}`;

  const hasAny = appts.length > 0 || slots.length > 0;

  return (
    <div className="content">
      <div className="content-wide">
        <div className="page-head page-head-row">
          <div>
            <h1>Scheduler</h1>
            <div className="ph-sub">Live mirror of your Open Dental calendar. Changes here write back instantly.</div>
          </div>
          <div className="row">
            <SyncPill state="saved" target="Open Dental" time="live" />
            <Segmented value={view} onChange={setView} options={[{ value: "day", label: "Day" }, { value: "week", label: "Week" }]} />
            <Button variant="secondary" icon="clock" onClick={() => setShowAvail(true)}>Availability</Button>
            <Button variant="primary" icon="plus" onClick={() => setShowBook(true)}>New appointment</Button>
          </div>
        </div>

        <div className="row" style={{ marginBottom: 14, justifyContent: "space-between" }}>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn-icon btn-secondary" style={{ height: 36, width: 36 }} onClick={() => setAnchor((a) => addDays(a, -7))}><Icon name="chevL" size={16} /></button>
            <strong style={{ fontSize: 16 }}>{rangeLabel}</strong>
            <button className="btn-icon btn-secondary" style={{ height: 36, width: 36 }} onClick={() => setAnchor((a) => addDays(a, 7))}><Icon name="chevR" size={16} /></button>
            <Button variant="ghost" size="sm" onClick={() => setAnchor(startOfWeek(new Date()))}>Today</Button>
          </div>
          <div className="row" style={{ gap: 14, fontSize: 12.5 }}>
            <span className="row" style={{ gap: 6 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: "var(--p-500)" }} />Confirmed</span>
            <span className="row" style={{ gap: 6 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: "var(--warn)" }} />Unconfirmed</span>
            <span className="row" style={{ gap: 6 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: "var(--a-600)" }} />Arrived</span>
          </div>
        </div>

        {phase === "loading" && <SkelBlock h={9 * 56 + 64} />}
        {phase === "error" && <ErrorState title="Couldn’t load the calendar" desc="We couldn’t reach Open Dental. Your schedule is safe — nothing was lost." onRetry={load} />}
        {phase === "ready" && !hasAny && (
          <EmptyState icon="calendar" title="Nothing scheduled this week" desc="No appointments or open slots in this window. Book one to see it appear here." action={<Button variant="primary" icon="plus" onClick={() => setShowBook(true)}>New appointment</Button>} />
        )}
        {phase === "ready" && hasAny && (
          <div className="card" style={{ overflow: "hidden", padding: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: `56px repeat(${visibleDays.length}, 1fr)` }}>
              <div className="cal-corner" />
              {visibleDays.map((d) => (
                <div className={`cal-dayhead ${sameDay(d, today) ? "today" : ""}`} key={iso(d)}>
                  <div className="cd-dow">{DOW[d.getDay()]}</div>
                  <div className="cd-num">{d.getDate()}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `56px repeat(${visibleDays.length}, 1fr)`, position: "relative" }}>
              <div>
                {HOURS.map((h) => <div className="cal-hr" key={h}>{fmtHr(h)}</div>)}
              </div>
              {visibleDays.map((d) => (
                <div className="cal-col" key={iso(d)} style={{ position: "relative" }}>
                  {HOURS.map((h) => <div className="cal-slot" key={h} />)}
                  {slotsForDay(d).map((s, i) => {
                    const sd = new Date(s.start);
                    const top = (decimalHour(sd) - 8) * 56;
                    if (top < 0 || top > (HOURS.length - 1) * 56) return null;
                    const dur = s.end ? Math.max(30, (new Date(s.end) - sd) / 60000) : 60;
                    const height = (dur / 60) * 56 - 4;
                    return (
                      <button key={`slot-${i}`} className="cal-openslot" style={{ position: "absolute", left: 4, right: 4, top: top + 1, height, borderRadius: 7, border: "1px dashed var(--p-300)", background: "var(--p-25, var(--n-25))", color: "var(--p-600)", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={() => setShowBook(true)}>
                        + Open · {slotLabel(s)}
                      </button>
                    );
                  })}
                  {apptsForDay(d).map((a, i) => {
                    const sd = new Date(a.start);
                    const top = (decimalHour(sd) - 8) * 56;
                    if (top < 0 || top > (HOURS.length - 1) * 56) return null;
                    const height = (durationMin(a) / 60) * 56 - 4;
                    return (
                      <div key={a.id || i} className={`appt ${TONE[status(a)] || "appt-confirmed"}`} style={{ top: top + 1, height }} onClick={() => setActive(a)}>
                        <div className="ap-name">{a.patient_name || `Patient #${a.patient_id}`}</div>
                        <div style={{ opacity: 0.85 }}>{a.reason || "Appointment"}</div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {active && <ApptModal appt={active} onClose={() => setActive(null)} onChanged={load} providers={providers} operatories={operatories} />}
      <AvailModal open={showAvail} onClose={() => setShowAvail(false)} />
      <BookModal open={showBook} onClose={() => setShowBook(false)} slots={slots} patients={patients} providers={providers} operatories={operatories} onBooked={load} />
    </div>
  );
}
