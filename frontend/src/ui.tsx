import {
  useState,
  useEffect,
  createContext,
  useContext,
} from "react";
import type {
  ReactNode,
  CSSProperties,
  ButtonHTMLAttributes,
  MouseEvent,
} from "react";
import { avatarColor, initials } from "./data";

const ICONS: Record<string, string> = {
  today: '<path d="M3 12 12 3l9 9"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
  leads: '<path d="M4 5h16v14H4z"/><path d="M4 9h16"/><path d="M8 13h5"/><path d="M8 16h8"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  forms: '<path d="M14 3v5h5"/><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M8 13h8M8 17h5"/>',
  send: '<path d="M14.5 9.5 21 3m0 0-6.5 18-4-9-9-4z"/>',
  message: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/>',
  timeline: '<circle cx="12" cy="7" r="4"/><path d="M5.5 21a7 7 0 0 1 13 0"/>',
  reports: '<path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  checkCircle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  chevR: '<polyline points="9 18 15 12 9 6"/>',
  chevL: '<polyline points="15 18 9 12 15 6"/>',
  chevD: '<polyline points="6 9 12 15 18 9"/>',
  chevU: '<polyline points="18 15 12 9 6 15"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  phoneMissed: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/><path d="m15 2 5 5M20 2l-5 5" stroke-width="2.4"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 6 10 7 10-7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
  sync: '<path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>',
  refresh: '<path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>',
  alertTri: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  shield: '<path d="M12 2 4 5v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5z"/><polyline points="9 12 11 14 15 10"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
  more: '<circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/><circle cx="5" cy="12" r="1.6"/>',
  arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  arrowDown: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  signature: '<path d="M3 17c3 0 3-9 6-9s3 6 6 6 3-3 6-3"/><path d="M2 21h20"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
  kanban: '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="11" rx="1"/><rect x="17" y="4" width="4" height="14" rx="1"/>',
  grip: '<circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/>',
  menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
  dollar: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M5.5 21a7 7 0 0 1 13 0"/>',
  userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
  alertCircle: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
  arrowRight: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  calCheck: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/><polyline points="9 15 11 17 15 13"/>',
  chevRR: '<polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  pause: '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
  printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/>',
  trending: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  type: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
};

export interface IconProps {
  name: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
  style?: CSSProperties;
}

export function Icon({ name, size = 18, className = "", strokeWidth = 1.8, style }: IconProps) {
  const d = ICONS[name] || ICONS.info;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
         className={className} style={style} aria-hidden dangerouslySetInnerHTML={{ __html: d }} />
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: string;
  size?: string;
  icon?: string;
  iconRight?: string;
  loading?: boolean;
}

export function Button({ variant = "secondary", size, icon, iconRight, loading, children, className = "", ...rest }: ButtonProps) {
  const cls = ["btn", `btn-${variant}`, size && `btn-${size}`, className].filter(Boolean).join(" ");
  return (
    <button className={cls} {...rest}>
      {loading && <span className="spinner" />}
      {!loading && icon && <Icon name={icon} className="ic" />}
      {children}
      {!loading && iconRight && <Icon name={iconRight} className="ic" />}
    </button>
  );
}

export interface BadgeProps {
  tone?: string;
  icon?: string;
  dot?: boolean;
  children?: ReactNode;
}

export function Badge({ tone = "neutral", icon, dot, children }: BadgeProps) {
  return (
    <span className={`badge badge-${tone}`}>
      {dot && <span className="b-dot" />}
      {icon && <Icon name={icon} />}
      {children}
    </span>
  );
}

export interface SyncPillProps {
  state?: string;
  target?: string;
  time?: string;
  onRetry?: () => void;
}

export function SyncPill({ state = "saved", target = "Open Dental", time, onRetry }: SyncPillProps) {
  if (state === "syncing")
    return <span className="sync sync-prog"><Icon name="sync" className="ic" />Saving to {target}…</span>;
  if (state === "failed")
    return (
      <span className="sync sync-fail" role="alert">
        <Icon name="alertTri" className="ic" />Not saved to {target}
        {onRetry && <button onClick={onRetry} style={{ marginLeft: 4, textDecoration: "underline", fontWeight: 700, color: "inherit" }}>Retry</button>}
      </span>
    );
  return (
    <span className="sync sync-saved"><span className="pulse" /><Icon name="check" className="ic" />Saved to {target}{time ? ` · ${time}` : ""}</span>
  );
}

export interface AvatarProps {
  name: string;
  size?: string;
  color?: string;
}

export function Avatar({ name, size = "md", color }: AvatarProps) {
  return <span className={`avatar avatar-${size}`} style={{ background: color || avatarColor(name) }}>{initials(name)}</span>;
}

export interface StatCardProps {
  icon: string;
  label: ReactNode;
  value: ReactNode;
  delta?: string;
  good?: boolean;
  accent?: boolean;
  onClick?: () => void;
  hint?: ReactNode;
}

export function StatCard({ icon, label, value, delta, good, accent, onClick, hint }: StatCardProps) {
  return (
    <button className="statcard card card-hover" onClick={onClick} style={{ textAlign: "left" }}>
      <div className="statcard-top">
        <span className="statcard-ic" style={accent ? { background: "var(--a-50)", color: "var(--a-700)" } : undefined}><Icon name={icon} size={18} /></span>
        {delta && <span className={`statcard-delta ${good ? "up" : "down"}`}><Icon name={good ? "arrowUp" : "arrowDown"} size={12} />{delta}</span>}
      </div>
      <div className="statcard-val tnum">{value}</div>
      <div className="statcard-label">{label}</div>
      {hint && <div className="statcard-hint">{hint}</div>}
    </button>
  );
}

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Checkbox({ checked, onChange }: CheckboxProps) {
  return (
    <button role="checkbox" aria-checked={checked} className="check" onClick={(e: MouseEvent) => { e.stopPropagation(); onChange(!checked); }}>
      <Icon name="check" strokeWidth={3} />
    </button>
  );
}

export interface Toast {
  id: string;
  title?: ReactNode;
  desc?: ReactNode;
  tone?: string;
  icon?: string;
  duration?: number;
}

export type ToastInput = Omit<Toast, "id">;
export type ToastPush = (t: ToastInput) => void;

const ToastCtx = createContext<ToastPush>(() => {});

export interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push: ToastPush = (t) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((x) => [...x, { id, ...t }]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), t.duration || 3800);
  };
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone || "default"}`}>
            <Icon name={t.icon || (t.tone === "success" ? "checkCircle" : "info")} size={18} className="toast-ic" />
            <div className="toast-body">
              <div className="toast-title">{t.title}</div>
              {t.desc && <div className="toast-desc">{t.desc}</div>}
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = (): ToastPush => useContext(ToastCtx);

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
  width?: number;
}

export function Drawer({ open, onClose, children, width = 460 }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open]);
  return (
    <div className={`drawer-overlay ${open ? "is-open" : ""}`} onClick={onClose}>
      <aside className={`drawer ${open ? "is-open" : ""}`} style={{ width }} onClick={(e: MouseEvent) => e.stopPropagation()} role="dialog" aria-modal="true">
        {open && children}
      </aside>
    </div>
  );
}

export interface EmptyStateProps {
  icon: string;
  title: ReactNode;
  desc?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon, title, desc, action }: EmptyStateProps) {
  return (
    <div className="empty">
      <span className="em-ic"><Icon name={icon} /></span>
      <h3>{title}</h3>
      <p>{desc}</p>
      {action}
    </div>
  );
}

export interface SegmentedOption {
  value: string;
  label: ReactNode;
  icon?: string;
}

export interface SegmentedProps {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
}

export function Segmented({ options, value, onChange }: SegmentedProps) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button key={o.value} className={value === o.value ? "active" : ""} onClick={() => onChange(o.value)} role="tab" aria-selected={value === o.value}>
          {o.icon && <Icon name={o.icon} size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />}{o.label}
        </button>
      ))}
    </div>
  );
}

export interface PaginationProps {
  page?: number;
  onChange?: (page: number) => void;
  label?: ReactNode;
}

export function Pagination({ page = 1, onChange = () => {}, label = "Showing 1–10 of 48" }: PaginationProps) {
  return (
    <div className="between" style={{ padding: "12px 18px", borderTop: "1px solid var(--line)" }}>
      <span className="muted" style={{ fontSize: 13 }}>{label}</span>
      <div className="row" style={{ gap: 4 }}>
        <button className="btn-icon btn-secondary" style={{ width: 34, height: 34 }} disabled={page === 1} onClick={() => onChange(page - 1)}><Icon name="chevL" size={15} /></button>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} className="btn-icon" style={{ width: 34, height: 34, background: n === page ? "var(--p-500)" : "transparent", color: n === page ? "#fff" : "var(--ink-soft)", fontWeight: 600, fontSize: 13.5 }} onClick={() => onChange(n)}>{n}</button>
        ))}
        <button className="btn-icon btn-secondary" style={{ width: 34, height: 34 }} onClick={() => onChange(page + 1)}><Icon name="chevR" size={15} /></button>
      </div>
    </div>
  );
}

export interface SortState {
  field: string;
  dir: "asc" | "desc";
}

export interface SortThProps {
  label: ReactNode;
  field: string;
  sort?: SortState | null;
  onSort: (field: string) => void;
  style?: CSSProperties;
}

export function SortTh({ label, field, sort, onSort, style }: SortThProps) {
  const active = sort && sort.field === field;
  return (
    <th className="sortable" style={style} onClick={() => onSort(field)}>
      <span className="row" style={{ gap: 5, display: "inline-flex" }}>
        {label}
        <span style={{ display: "inline-flex", flexDirection: "column", opacity: active ? 1 : 0.35 }}>
          <Icon name="chevU" size={11} style={{ marginBottom: -4, color: active && sort.dir === "asc" ? "var(--p-500)" : "currentColor" }} />
          <Icon name="chevD" size={11} style={{ color: active && sort.dir === "desc" ? "var(--p-500)" : "currentColor" }} />
        </span>
      </span>
    </th>
  );
}

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ checked, onChange }: ToggleProps) {
  return <button role="switch" aria-checked={checked} className="toggle" onClick={() => onChange(!checked)} />;
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export function Modal({ open, onClose, title, children, footer, width = 480 }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open]);
  if (!open) return null;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: width }} onClick={(e: MouseEvent) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2 className="modal-title">{title}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export interface TipProps {
  label: ReactNode;
  children?: ReactNode;
}

export function Tip({ label, children }: TipProps) {
  return <span className="tip">{children}<span className="tip-bubble">{label}</span></span>;
}

export interface DatePickerProps {
  value?: string;
  label?: ReactNode;
}

export function DatePicker({ value = "Jun 9, 2026", label }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const sel = 9;
  return (
    <div className="field" style={{ position: "relative" }}>
      {label && <label className="label">{label}</label>}
      <button className="input" style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left" }} onClick={() => setOpen((v) => !v)}>
        <Icon name="calendar" size={16} style={{ color: "var(--ink-muted)" }} />{value}
        <Icon name="chevD" size={15} style={{ marginLeft: "auto", color: "var(--ink-muted)" }} />
      </button>
      {open && (
        <div className="card" style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50, padding: 14, width: 264, boxShadow: "var(--sh-pop)" }}>
          <div className="between" style={{ marginBottom: 10 }}>
            <button className="btn-icon" style={{ width: 30, height: 30 }}><Icon name="chevL" size={15} /></button>
            <strong style={{ fontSize: 14 }}>June 2026</strong>
            <button className="btn-icon" style={{ width: 30, height: 30 }}><Icon name="chevR" size={15} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, fontSize: 11, color: "var(--ink-muted)", textAlign: "center", marginBottom: 4 }}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} style={{ fontWeight: 600, padding: 4 }}>{d}</div>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {days.map((d) => (
              <button key={d} onClick={() => setOpen(false)} style={{ aspectRatio: "1", borderRadius: 7, fontSize: 13, fontWeight: d === sel ? 700 : 500, background: d === sel ? "var(--p-500)" : "transparent", color: d === sel ? "#fff" : "var(--ink)" }}>{d}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export interface SkelRowsProps {
  n?: number;
  avatar?: boolean;
}

export function SkelRows({ n = 5, avatar = true }: SkelRowsProps) {
  return (
    <div>
      {Array.from({ length: n }).map((_, i) => (
        <div className="lrow" key={i} style={{ gap: 13 }}>
          {avatar && <div className="skel" style={{ width: 30, height: 30, borderRadius: "50%", flex: "none" }} />}
          <div style={{ flex: 1 }}>
            <div className="skel" style={{ height: 13, width: `${50 + (i % 3) * 12}%`, marginBottom: 7 }} />
            <div className="skel" style={{ height: 11, width: `${30 + (i % 2) * 18}%` }} />
          </div>
          <div className="skel" style={{ height: 22, width: 70, borderRadius: 999, flex: "none" }} />
        </div>
      ))}
    </div>
  );
}

export interface SkelCardsProps {
  n?: number;
}

export function SkelCards({ n = 6 }: SkelCardsProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
      {Array.from({ length: n }).map((_, i) => (
        <div className="card card-pad" key={i}>
          <div className="skel" style={{ width: 38, height: 38, borderRadius: 10, marginBottom: 14 }} />
          <div className="skel" style={{ height: 15, width: "70%", marginBottom: 8 }} />
          <div className="skel" style={{ height: 12, width: "45%", marginBottom: 18 }} />
          <div className="skel" style={{ height: 30, width: "100%" }} />
        </div>
      ))}
    </div>
  );
}

export interface SkelBlockProps {
  h?: number;
}

export function SkelBlock({ h = 200 }: SkelBlockProps) {
  return <div className="skel" style={{ height: h, width: "100%", borderRadius: "var(--r-lg)" }} />;
}

export interface ErrorStateProps {
  title?: ReactNode;
  desc?: ReactNode;
  onRetry?: () => void;
}

export function ErrorState({ title = "Couldn’t load this", desc, onRetry }: ErrorStateProps) {
  return (
    <div className="empty">
      <span className="em-ic" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}><Icon name="alertTri" /></span>
      <h3>{title}</h3>
      <p>{desc || "Something went wrong reaching the server. Your data is safe — nothing was lost."}</p>
      <Button variant="secondary" icon="refresh" onClick={onRetry}>Try again</Button>
    </div>
  );
}

export interface DataStateProps {
  children: ReactNode;
}

export function DataState({ children }: DataStateProps) {
  return <>{children}</>;
}

export interface UpgradePromptProps {
  title: ReactNode;
  desc?: ReactNode;
  requiredPlan?: string;
  onUpgrade?: () => void;
}

export function UpgradePrompt({ title, desc, requiredPlan, onUpgrade }: UpgradePromptProps) {
  return (
    <div className="card card-pad" style={{ textAlign: "center", padding: "40px 28px", border: "1px dashed var(--line)" }}>
      <span className="em-ic" style={{ background: "var(--a-50)", color: "var(--a-700)", margin: "0 auto 14px" }}><Icon name="zap" /></span>
      <h3 style={{ margin: "0 0 6px", fontSize: 17 }}>{title}</h3>
      {desc && <p className="muted" style={{ maxWidth: 440, margin: "0 auto 18px", fontSize: 13.5, lineHeight: 1.55 }}>{desc}</p>}
      {onUpgrade && (
        <Button variant="primary" icon="zap" onClick={onUpgrade}>
          {requiredPlan ? `Upgrade to ${requiredPlan}` : "See plans"}
        </Button>
      )}
    </div>
  );
}

export interface UsageMeterProps {
  label: ReactNode;
  used: number;
  included: number;
  unit?: string;
}

export function UsageMeter({ label, used, included, unit }: UsageMeterProps) {
  const pct = included > 0 ? Math.min(100, Math.round((used / included) * 100)) : 0;
  const over = included > 0 && used >= included;
  const near = pct >= 80;
  const color = over ? "var(--danger)" : near ? "var(--a-700)" : "var(--p-400)";
  const cap = included > 0 ? included.toLocaleString() : "—";
  return (
    <div style={{ padding: "13px 0" }}>
      <div className="between" style={{ marginBottom: 7 }}>
        <span style={{ fontSize: 13.5, fontWeight: 500 }}>{label}</span>
        <span className="tnum muted" style={{ fontSize: 13 }}>{used.toLocaleString()} / {cap}{unit ? ` ${unit}` : ""}</span>
      </div>
      <div style={{ height: 7, background: "var(--n-100)", borderRadius: 99 }}>
        <div style={{ width: pct + "%", height: "100%", background: color, borderRadius: 99 }} />
      </div>
    </div>
  );
}
