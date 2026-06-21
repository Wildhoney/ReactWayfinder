import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { router } from "./utils";
import { ModeProvider, useMode } from "./components/mode";
import { NamesProvider } from "./components/names";
import Progress from "./components/progress";
import GithubCorner from "./components/github";

/** Root application component that renders the router with the current mode. */
function App(): ReactElement {
  const { mode } = useMode();

  return (
    <router.Router mode={mode} base={import.meta.env.BASE_URL}>
      <Progress />
      <GithubCorner href="https://github.com/Wildhoney/ReactWayfinder" />
    </router.Router>
  );
}

createRoot(document.getElementById("root")!).render(
  <ModeProvider>
    <NamesProvider>
      <App />
    </NamesProvider>
  </ModeProvider>,
);
