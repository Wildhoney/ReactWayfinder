import type { ReactElement } from "react";
import Navigation from "../navigation";
import { Page } from "./styles";

/** Catch-all 404 page rendered when no route matches the current URL. */
export default function Missing(): ReactElement {
  return (
    <>
      <Navigation />
      <Page>
        <h1>404</h1>
        <p>Page not found.</p>
      </Page>
    </>
  );
}
