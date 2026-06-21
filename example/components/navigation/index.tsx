import type { ReactElement } from "react";
import { Route } from "react-wayfinder";
import type { RouterMode } from "react-wayfinder";
import { router } from "../../utils";
import { useMode } from "../mode";
import { useNames } from "../names";
import { ModeContainer, ModeLabel, ModeSelect } from "../../styles";
import { Container, A } from "./styles";
import { Spinner } from "../../styles";

/** Top-level navigation bar with route links, per-link pending spinners, and a mode switcher. */
export default function Navigation(): ReactElement {
  const context = router.useContext();
  const { mode, setMode } = useMode();
  const { names } = useNames();

  return (
    <>
      <Container>
        <Route href={context.url.home()}>
          {(route) => (
            <A href={route.href} active={route.active}>
              Home
            </A>
          )}
        </Route>

        <Route href={context.url.about()}>
          {(route) => (
            <A href={route.href} active={route.active}>
              About
            </A>
          )}
        </Route>

        <Route href={context.url.feed()}>
          {(route) => (
            <A href={route.href} active={route.active}>
              Feed
            </A>
          )}
        </Route>

        {[1, 2, 3].map((id) => (
          <Route key={id} href={context.url.user({ id })}>
            {(route) => (
              <A href={route.href} active={route.active}>
                {names[id] || `User ${id}`} {route.pending ? <Spinner /> : null}
              </A>
            )}
          </Route>
        ))}

        <Route
          href={context.url.contact({ method: "email" })}
          active={(path) => path.startsWith("/contact")}
        >
          {(route) => (
            <A href={route.href} active={route.active}>
              Contact
            </A>
          )}
        </Route>
      </Container>
      <ModeContainer>
        <ModeLabel>Mode</ModeLabel>
        <ModeSelect
          value={mode}
          onChange={(event) => setMode(event.target.value as RouterMode)}
        >
          <option value="deferred">Deferred</option>
          <option value="immediate">Immediate</option>
        </ModeSelect>
      </ModeContainer>
    </>
  );
}
