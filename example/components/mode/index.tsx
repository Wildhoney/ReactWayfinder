import { createContext, useContext, useMemo, useState } from "react";
import type { RouterMode } from "react-wayfinder";
import type { ModeContext } from "./types";

const Context = createContext<ModeContext>({
  mode: "deferred",
  setMode: () => {},
});

/** Provides the current {@link RouterMode} and a setter to descendant components. */
export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<RouterMode>("deferred");

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

/** Returns the current router mode and a function to change it. */
export function useMode() {
  return useContext(Context);
}
