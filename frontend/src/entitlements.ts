import type { Entitlements } from "./types";

const KEY = "pb_entitlements";

export function setEntitlements(ent: Entitlements | null | undefined): void {
  try {
    if (ent) localStorage.setItem(KEY, JSON.stringify(ent));
    else localStorage.removeItem(KEY);
  } catch {
    return;
  }
}

export function getEntitlements(): Entitlements | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Entitlements) : null;
  } catch {
    return null;
  }
}

export function hasFeature(key: string): boolean {
  const ent = getEntitlements();
  return !!ent && ent.features.includes(key);
}

export function planKey(): string {
  return getEntitlements()?.plan || "core";
}

export function clearEntitlements(): void {
  setEntitlements(null);
}
