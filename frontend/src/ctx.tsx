import { createContext, useContext } from "react";

export interface NavValue {
  navigate(key: string, params?: Record<string, unknown>): void;
  route: string;
  params: Record<string, unknown>;
}

const NavCtx = createContext<NavValue>({ navigate: () => {}, route: "today", params: {} });
export const NavProvider = NavCtx.Provider;
export const useNav = (): NavValue => useContext(NavCtx);
