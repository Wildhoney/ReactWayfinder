import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { NamesContext } from "./types";

const Context = createContext<NamesContext>({
  names: {},
  setName: () => {},
});

/** Provides a shared map of user display name overrides to descendant components. */
export function NamesProvider({ children }: { children: React.ReactNode }) {
  const [names, setNames] = useState<Record<string, string>>({});

  const setName = useCallback((id: string, name: string) => {
    setNames((previous) => ({ ...previous, [id]: name }));
  }, []);

  const value = useMemo(() => ({ names, setName }), [names, setName]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

/** Returns the current names map and a function to set a user's display name. */
export function useNames() {
  return useContext(Context);
}
