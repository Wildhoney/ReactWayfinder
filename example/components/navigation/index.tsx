import type { ReactElement } from "react";
import { Route, useRouter } from "react-wayfinder";
import type { RouterMode } from "react-wayfinder";
import { urls } from "../../utils";
import { useMode } from "../mode";
import { useNames } from "../names";
import { ModeContainer, ModeLabel, ModeSelect } from "../../styles";
import { Container, A } from "./styles";
import { Spinner } from "../../styles";

/** Top-level navigation bar with route links, per-link pending spinners, and a mode switcher. */
export default function Navigation(): ReactElement {
  const router = useRouter();
  const { mode, setMode } = useMode();
  const { names } = useNames();

  return (
    <>
      <Container>
        <Route href={router.url(urls.home)}>
          {(route) => (
            <A href={route.href} active={route.active} onClick={route.handler}>
              Home
            </A>
          )}
        </Route>

        <Route href={router.url(urls.about)}>
          {(route) => (
            <A href={route.href} active={route.active} onClick={route.handler}>
              About
            </A>
          )}
        </Route>

        <Route href={router.url(urls.feed)}>
          {(route) => (
            <A href={route.href} active={route.active} onClick={route.handler}>
              Feed
            </A>
          )}
        </Route>

        {[1, 2, 3].map((id) => (
          <Route key={id} href={router.url(urls.user, { id })}>
            {(route) => (
              <A
                href={route.href}
                active={route.active}
                onClick={route.handler}
              >
                {names[id] || `User ${id}`} {route.pending ? <Spinner /> : null}
              </A>
            )}
          </Route>
        ))}

        <Route
          href={router.url(urls.contact, { method: "email" })}
          active={(path) => path.startsWith("/contact")}
        >
          {(route) => (
            <A href={route.href} active={route.active} onClick={route.handler}>
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
