import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Button, Icon, useToast } from "../ui";
import { api } from "../api";
import { DATA } from "../data";
import type { User } from "../types";

export interface LoginProps {
  onSuccess: (user: User, token: string) => void;
}

export default function Login({ onSuccess }: LoginProps) {
  const toast = useToast();
  const [email, setEmail] = useState("dana@brightsmile.co");
  const [password, setPassword] = useState("demo1234");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.login(email, password);
      toast({ tone: "success", title: `Welcome back, ${res.user?.name || "there"}`, desc: "Signed in to Almond", icon: "checkCircle" });
      onSuccess(res.user, res.token);
    } catch {
      setError("That email and password don't match. Try the demo credentials below.");
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--page)" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div className="auth-brand" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <span className="nav-logo" style={{ width: 48, height: 48, borderRadius: 13, fontSize: 24 }}>A</span>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em" }}>Almond</div>
            <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>Private AI-powered front office</div>
          </div>
        </div>

        <form className="card card-pad" onSubmit={signIn} style={{ boxShadow: "var(--sh-pop)" }}>
          <div style={{ marginBottom: 20 }}>
            <div className="card-title">Sign in</div>
            <div className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>{DATA.practice.name} · {DATA.practice.location}</div>
          </div>

          <div className="stack" style={{ gap: 16 }}>
            <div className="field">
              <label className="label" htmlFor="auth-email">Email</label>
              <div className="input-wrap">
                <Icon name="mail" className="lead-ic" />
                <input id="auth-email" className="input" type="email" autoComplete="username" value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => { setEmail(e.target.value); setError(null); }} placeholder="you@practice.co" />
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="auth-password">Password</label>
              <div className="input-wrap">
                <Icon name="lock" className="lead-ic" />
                <input id="auth-password" className="input" type="password" autoComplete="current-password" value={password} onChange={(e: ChangeEvent<HTMLInputElement>) => { setPassword(e.target.value); setError(null); }} placeholder="••••••••" />
              </div>
            </div>

            {error && (
              <div className="alert alert-danger" role="alert">
                <Icon name="alertTri" className="ic" />
                <div>{error}</div>
              </div>
            )}

            <Button variant="primary" type="submit" icon="lock" iconRight="arrowRight" loading={busy} className="btn-block" disabled={!email || !password}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </div>
        </form>

        <div className="card" style={{ marginTop: 16, padding: "14px 16px" }}>
          <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
            <Icon name="info" size={16} style={{ color: "var(--ink-muted)", marginTop: 2, flex: "none" }} />
            <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
              <strong style={{ color: "var(--ink-2)" }}>Demo credentials</strong> — pre-filled for this proof of concept.
              <div className="mono" style={{ marginTop: 6, fontSize: 12 }}>dana@brightsmile.co · demo1234</div>
            </div>
          </div>
        </div>

        <div className="muted" style={{ textAlign: "center", fontSize: 12, marginTop: 18 }}>
          <span className="row" style={{ gap: 6, justifyContent: "center" }}><Icon name="shield" size={13} />HIPAA-aware · Live to {DATA.practice.pms}</span>
        </div>
      </div>
    </div>
  );
}
