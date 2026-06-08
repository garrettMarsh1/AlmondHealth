import { useState, useRef, useEffect } from "react";
import { Button, Badge, Avatar, useToast, Icon, SkelRows, SkelBlock, EmptyState, ErrorState } from "../ui";
import { useNav } from "../ctx";
import { api } from "../api";
import { DATA } from "../data";

const fromOf = (m) => (m.direction === "out" ? "us" : m.direction === "system" ? "system" : "them");

const humanizeTime = (value) => {
  if (value == null || value === "") return "";
  const str = String(value).trim();
  if (!/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(str)) return str;
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  const now = new Date();
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dayDiff = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (dayDiff === 0) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (dayDiff === 1) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

export default function Messages() {
  const { params, navigate } = useNav();
  const toast = useToast();
  const [convos, setConvos] = useState([]);
  const [activeId, setActiveId] = useState(params.convId || null);
  const [active, setActive] = useState(null);
  const [listState, setListState] = useState("loading");
  const [threadState, setThreadState] = useState("idle");
  const [draft, setDraft] = useState("");
  const [showTpl, setShowTpl] = useState(false);
  const [sending, setSending] = useState(false);
  const bodyRef = useRef(null);

  const loadList = () => {
    setListState("loading");
    api.conversations()
      .then((cs) => {
        setConvos(cs);
        setListState(cs.length ? "ready" : "empty");
        setActiveId((id) => id || (cs[0] && cs[0].id) || null);
      })
      .catch(() => setListState("error"));
  };
  useEffect(() => { loadList(); }, []);

  const loadThread = (id) => {
    if (!id) return;
    setThreadState("loading");
    api.conversation(id)
      .then((c) => { setActive(c); setThreadState("ready"); })
      .catch(() => setThreadState("error"));
  };
  useEffect(() => { loadThread(activeId); }, [activeId]);

  useEffect(() => {
    setConvos((cs) => cs.map((c) => (c.id === activeId ? { ...c, unread: 0 } : c)));
  }, [activeId]);

  const messages = (active && active.messages) || [];
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages.length, activeId]);

  const send = () => {
    if (!draft.trim() || !active || sending) return;
    const text = draft;
    setSending(true);
    api.sendMessage(active.id, text)
      .then((res) => {
        setActive((c) => (c ? { ...c, messages: [...c.messages, res.message] } : c));
        setConvos((cs) => cs.map((c) => (c.id === active.id ? { ...c, last: text, when: "Now" } : c)));
        setDraft("");
      })
      .catch(() => toast({ title: "Couldn’t send", desc: "Message wasn’t delivered — try again.", icon: "alertTri" }))
      .finally(() => setSending(false));
  };

  const useTemplate = (t) => {
    const name = active && active.name ? active.name.split(" ")[0] : "";
    setDraft(t.body.replace("{{first_name}}", name).replace("{{practice}}", DATA.practice.name).replace("{{phone}}", DATA.practice.phone));
    setShowTpl(false);
  };

  return (
    <div className="content">
      <div className="content-wide">
        <div className="page-head">
          <h1>Messages</h1>
          <div className="ph-sub">Two-way text &amp; email with patients and leads — over your practice line, {DATA.practice.phone}.</div>
        </div>

        <div className="msg-layout">
          <div className="conv-list">
            <div style={{ padding: 12, borderBottom: "1px solid var(--line)" }}>
              <div className="input-wrap"><Icon name="search" className="lead-ic" /><input className="input" placeholder="Search conversations" /></div>
            </div>
            {listState === "loading" && <div style={{ padding: 12 }}><SkelRows n={4} /></div>}
            {listState === "error" && <ErrorState title="Couldn’t load conversations" onRetry={loadList} />}
            {listState === "empty" && <EmptyState icon="message" title="No conversations yet" desc="Texts and emails with patients and leads will show up here." />}
            {listState === "ready" && convos.map((c) => (
              <div key={c.id} className={`conv-item ${c.id === activeId ? "active" : ""}`} onClick={() => setActiveId(c.id)}>
                <Avatar name={c.name} size="md" />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="ci-top">
                    <span className="ci-name">{c.name}</span>
                    <span className="ci-when">{humanizeTime(c.when)}</span>
                  </div>
                  <div className="row" style={{ gap: 6, marginTop: 2 }}>
                    <Icon name={c.channel === "sms" ? "message" : "mail"} size={13} style={{ color: "var(--ink-muted)", flex: "none" }} />
                    <span className="ci-last">{c.last}</span>
                    {c.unread > 0 && <span className="conv-unread" style={{ marginLeft: "auto" }}>{c.unread}</span>}
                  </div>
                  {c.tag && <div style={{ marginTop: 6 }}><Badge tone={c.tag === "Lead" ? "apricot" : "neutral"}>{c.tag}</Badge></div>}
                </div>
              </div>
            ))}
          </div>

          <div className="thread">
            {threadState === "loading" && <div style={{ padding: 18 }}><SkelBlock h={360} /></div>}
            {threadState === "error" && <ErrorState title="Couldn’t load this conversation" onRetry={() => loadThread(activeId)} />}
            {(threadState === "idle" || (!active && threadState !== "loading" && threadState !== "error")) && (
              <EmptyState icon="message" title="Select a conversation" desc="Pick a conversation on the left to read and reply." />
            )}
            {threadState === "ready" && active && (
              <>
                <div className="thread-head">
                  <div className="row" style={{ gap: 11 }}>
                    <Avatar name={active.name} size="md" />
                    <div>
                      <div style={{ fontWeight: 700 }}>{active.name}</div>
                      <div className="muted mono" style={{ fontSize: 12 }}>{active.channel === "sms" ? `${active.phone || ""} · SMS` : "email"}</div>
                    </div>
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <Button variant="secondary" size="sm" icon="forms" onClick={() => navigate("sendform")}>Send form</Button>
                    <Button variant="secondary" size="sm" icon="user" onClick={() => navigate("patient", { patientId: active.patient_id })}>Profile</Button>
                  </div>
                </div>

                <div className="thread-body" ref={bodyRef}>
                  <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--ink-muted)", marginBottom: 4 }}>Today</div>
                  {messages.map((m, i) => {
                    const from = fromOf(m);
                    if (from === "system") return <div key={m.id || i} className="bubble-system"><Icon name="check" size={13} />{m.body}</div>;
                    return (
                      <div key={m.id || i} className={`bubble bubble-${from === "us" ? "us" : "them"}`}>
                        {m.body}
                        <div className="bubble-meta">{from === "us" && m.author ? `${m.author} · ` : ""}{humanizeTime(m.created_at)}{from === "us" ? " · Sent ✓" : ""}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="composer">
                  {showTpl && (
                    <div className="card" style={{ padding: 6 }}>
                      {DATA.smsTemplates.map((t) => (
                        <button key={t.name} className="lrow" style={{ width: "100%", borderRadius: 8, textAlign: "left" }} onClick={() => useTemplate(t)}>
                          <Icon name="zap" size={15} style={{ color: "var(--a-600)" }} />
                          <div className="lr-main"><div className="lr-title">{t.name}</div><div className="lr-sub" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.body}</div></div>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="composer-row">
                    <button className="btn-icon btn-secondary" onClick={() => setShowTpl((v) => !v)} title="Templates"><Icon name="zap" /></button>
                    <button className="btn-icon btn-secondary" onClick={() => toast({ title: "Reminder scheduled", desc: "Will send tomorrow 9:00 AM", icon: "clock" })} title="Schedule reminder"><Icon name="clock" /></button>
                    <textarea className="textarea" style={{ minHeight: 44, height: 44, flex: 1, padding: "11px 13px" }} placeholder="Write a message…" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
                    <Button variant="primary" icon="send" loading={sending} onClick={send}>Send</Button>
                  </div>
                  <div className="row" style={{ justifyContent: "space-between", fontSize: 11.5, color: "var(--ink-muted)" }}>
                    <span><Icon name="lock" size={12} style={{ verticalAlign: "-2px" }} /> Messages are logged to the patient timeline. No PHI in links — secure tokens only.</span>
                    <span><span className="kbd">Enter</span> send · <span className="kbd">Shift+Enter</span> newline</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
