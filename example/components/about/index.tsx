import type { ReactElement } from "react";
import { Route } from "react-wayfinder";
import { router } from "../../utils";
import { useNames } from "../names";
import Navigation from "../navigation";
import { Page, Profiles, Card, Avatar } from "./styles";
import { Spinner } from "../../styles";

/** Static about page with navigable team member cards. Has no `data` function so it renders instantly. */
export default function About(): ReactElement {
  const context = router.useContext();
  const { names } = useNames();

  return (
    <>
      <Navigation />
      <Page>
        <h1>About</h1>
        <p>
          This page has no <code>data</code> function so it renders instantly.
        </p>
        <h2>Team</h2>
        <Profiles>
          {[1, 2, 3].map((id) => (
            <Route key={id} href={context.url.user({ id })}>
              {(route) => (
                <Card onClick={route.handler}>
                  <Avatar
                    src={`https://i.pravatar.cc/80?u=user${id}`}
                    alt={names[id] || `User ${id}`}
                  />
                  <span>{names[id] || `User ${id}`}</span>
                  {route.pending ? <Spinner /> : null}
                </Card>
              )}
            </Route>
          ))}
        </Profiles>
      </Page>
    </>
  );
}
