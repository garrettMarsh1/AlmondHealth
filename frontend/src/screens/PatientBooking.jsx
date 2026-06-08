import { useState, useEffect } from "react";
import { Icon, SkelRows, ErrorState, EmptyState, useToast } from "../ui";
import { api } from "../api";
import { DATA } from "../data";

const SERVICES = [
  { name: "New patient cleaning & exam", dur: "60 min", desc: "Comprehensive first visit", minutes: 60 },
  { name: "Routine cleaning", dur: "45 min", desc: "For existing patients", minutes: 45 },
  { name: "Emergency / tooth pain", dur: "30 min", desc: "Same or next-day", minutes: 30 },
  { name: "Consultation", dur: "30 min", desc: "Cosmetic, Invisalign, implants", minutes: 30 },
];

const dayKey = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
};

const timeLabel = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

function groupByDay(slots) {
  const map = new Map();
  for (const s of slots) {
    if (!s || !s.start) continue;
    const key = dayKey(s.start);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  }
  for (const arr of map.values()) arr.sort((a, b) => new Date(a.start) - new Date(b.start));
  return map;
}

function StatusBar() {
  return (
    <div className="phone-status">
      <span>9:41</span>
      <span className="row" style={{ gap: 5 }}><Icon name="sync" size={13} /><Icon name="message" size={13} /><span style={{ fontWeight: 700 }}>87%</span></span>
    </div>
  );
}

export default function PatientBooking() {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [svc, setSvc] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [day, setDay] = useState(null);
  const [slot, setSlot] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(null);

  const service = SERVICES.find((s) => s.name === svc) || null;

  const loadSlots = () => {
    if (!service) return;
    setLoading(true);
    setError(false);
    const start = new Date().toISOString().slice(0, 10);
    const end = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
    api.availability(start, end, service.minutes)
      .then((rows) => {
        const list = Array.isArray(rows) ? rows.filter((s) => s && s.start) : [];
        setSlots(list);
        const grouped = groupByDay(list);
        const firstDay = grouped.keys().next().value || null;
        setDay(firstDay);
        setSlot(null);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (step === 1) loadSlots(); }, [step, svc]);

  const grouped = groupByDay(slots);
  const dayKeys = Array.from(grouped.keys());
  const daySlots = (day && grouped.get(day)) || [];

  const confirm = async () => {
    if (!slot || !service) return;
    setBooking(true);
    try {
      const reason = `${service.name} · ${name || "Patient"} · ${phone || "no phone"}`;
      const appt = await api.bookAppointment({
        patient_id: name || "self-booking",
        start: slot.start,
        operatory_id: slot.operatory_id,
        provider_id: slot.provider_id,
        reason,
      });
      setBooked({ day, time: timeLabel(slot.start), service: service.name });
      setStep(3);
      toast({ tone: "success", title: "You're booked!", desc: `${service.name} · ${day} · ${timeLabel(slot.start)}`, icon: "calCheck" });
      return appt;
    } catch {
      toast({ tone: "default", title: "Couldn't confirm", desc: "We couldn't reach the practice calendar. Nothing was lost — try again.", icon: "alertTri" });
    } finally {
      setBooking(false);
    }
  };

  const onPrimary = () => {
    if (step === 2) { confirm(); return; }
    setStep(step + 1);
  };

  const primaryDisabled =
    (step === 0 && !svc) ||
    (step === 1 && !slot) ||
    (step === 2 && (!name.trim() || !phone.trim()));

  const slotTime = slot ? timeLabel(slot.start) : "";

  return (
    <div className="phone">
      <div className="phone-notch" />
      <div className="phone-screen">
        <StatusBar />
        <div className="pat-header">
          <div className="row between">
            <div className="row" style={{ gap: 10 }}><span className="pat-logo">B</span><div><div style={{ fontWeight: 700, fontSize: 15 }}>{DATA.practice.name}</div><div style={{ fontSize: 12, opacity: 0.8 }}>Book an appointment</div></div></div>
          </div>
        </div>

        <div className="pt-scroll">
          <div className="pat-body">
            {step === 0 && (<>
              <div className="pat-q"><div className="pq-label">What do you need?</div><div className="pq-hint">Pick a reason for your visit.</div></div>
              {SERVICES.map((s) => (
                <div key={s.name} className={`pat-opt ${svc === s.name ? "sel" : ""}`} style={{ flexDirection: "column", alignItems: "flex-start", gap: 3 }} onClick={() => setSvc(s.name)}>
                  <div className="row between" style={{ width: "100%" }}><span style={{ fontWeight: 700 }}>{s.name}</span><span style={{ fontSize: 13, color: "var(--ink-muted)" }}>{s.dur}</span></div>
                  <span style={{ fontSize: 13, color: "var(--ink-soft)", fontWeight: 400 }}>{s.desc}</span>
                </div>
              ))}
            </>)}

            {step === 1 && (<>
              <div className="pat-q"><div className="pq-label">Pick a time</div><div className="pq-hint">Real openings, straight from the practice calendar.</div></div>
              {loading && <SkelRows n={4} avatar={false} />}
              {!loading && error && <ErrorState desc="We couldn't reach the practice calendar." onRetry={loadSlots} />}
              {!loading && !error && dayKeys.length === 0 && (
                <EmptyState icon="calendar" title="No openings right now" desc="There are no open times in the next two weeks. Please call us and we'll find a spot." />
              )}
              {!loading && !error && dayKeys.length > 0 && (<>
                <div className="row" style={{ gap: 8, marginBottom: 16, overflowX: "auto" }}>
                  {dayKeys.map((d) => (
                    <button key={d} className="slot" style={{ flex: "none", padding: "10px 14px", ...(day === d ? { borderColor: "var(--p-500)", background: "var(--p-50)", color: "var(--p-700)" } : {}) }} onClick={() => { setDay(d); setSlot(null); }}>{d}</button>
                  ))}
                </div>
                <div className="slot-grid">
                  {daySlots.map((s) => (
                    <div key={s.start} className={`slot ${slot && slot.start === s.start ? "sel" : ""}`} onClick={() => setSlot(s)}>{timeLabel(s.start)}</div>
                  ))}
                </div>
              </>)}
            </>)}

            {step === 2 && (<>
              <div className="pat-q"><div className="pq-label">Almost there</div><div className="pq-hint">Just your name and number to confirm.</div></div>
              <div className="stack" style={{ gap: 12 }}>
                <input className="pat-input" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                <input className="pat-input" placeholder="Mobile phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="card card-pad" style={{ marginTop: 18, background: "var(--p-50)", borderColor: "var(--p-100)" }}>
                <div className="row" style={{ gap: 10 }}><Icon name="calendar" size={18} style={{ color: "var(--p-500)" }} /><div><div style={{ fontWeight: 700, fontSize: 14 }}>{svc}</div><div style={{ fontSize: 13, color: "var(--p-700)" }}>{day} · {slotTime}</div></div></div>
              </div>
            </>)}

            {step === 3 && booked && (
              <div style={{ textAlign: "center", paddingTop: 30 }}>
                <span style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--ok-bg)", color: "var(--ok)", display: "inline-grid", placeItems: "center", marginBottom: 20 }}><Icon name="check" size={38} strokeWidth={3} /></span>
                <div style={{ fontSize: 23, fontWeight: 800, marginBottom: 10 }}>You're booked!</div>
                <p style={{ fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.5 }}>We'll text you a reminder. See you {booked.day} at <strong style={{ color: "var(--ink)" }}>{booked.time}</strong>.</p>
                <div className="card card-pad" style={{ marginTop: 22, textAlign: "left", background: "var(--n-25)" }}>
                  <div style={{ fontWeight: 700 }}>{booked.service}</div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{booked.day} · {booked.time} · {DATA.practice.location}</div>
                </div>
                <button style={{ fontSize: 14, color: "var(--p-600)", fontWeight: 700, marginTop: 20 }}>Add to calendar</button>
              </div>
            )}
          </div>
        </div>

        {step < 3 && (
          <div className="pat-foot">
            <button className="btn btn-primary btn-lg btn-block" onClick={onPrimary} disabled={primaryDisabled || booking}>
              {booking ? "Confirming…" : step === 2 ? "Confirm booking" : "Continue"}<Icon name="arrowRight" className="ic" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
