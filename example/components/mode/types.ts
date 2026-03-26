import type { RouterMode } from "react-wayfinder";

/** Shape of the mode context value shared via {@link ModeProvider}. */
export type ModeContext = {
  /** The active router transition mode. */
  mode: RouterMode;
  /** Replaces the current mode. */
  setMode: (mode: RouterMode) => void;
};
