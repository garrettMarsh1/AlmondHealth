import { createContext, useContext } from "react";

const NavCtx = createContext({ navigate: () => {}, route: "today", params: {} });
export const NavProvider = NavCtx.Provider;
export const useNav = () => useContext(NavCtx);
