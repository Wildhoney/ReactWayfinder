import { createRoot } from "react-dom/client";
import { Router } from "react-wayfinder";

import { routes } from "./utils";
import { ModeProvider, useMode } from "./components/mode";
import { NamesProvider } from "./components/names";
import Progress from "./components/progress";
import GithubCorner from "./components/github";

/** Root application component that renders the router with the current mode. */
function App() {
  const { mode } = useMode();

  return (
    <Router routes={routes} mode={mode}>
      <Progress />
      <GithubCorner href="https://github.com/Wildhoney/ReactWayfinder" />
    </Router>
  );
}

createRoot(document.getElementById("root")!).render(
  <ModeProvider>
    <NamesProvider>
      <App />
    </NamesProvider>
  </ModeProvider>,
);
