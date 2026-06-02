import type { ReactElement } from "react";
import Navigation from "../navigation";
import { Page } from "./styles";

/** Landing page with a welcome message. Has no `data` function so it renders instantly. */
export default function Home(): ReactElement {
  return (
    <>
      <Navigation />
      <Page>
        <h1>Home</h1>
        <p>Welcome to the react-wayfinder example.</p>
      </Page>
    </>
  );
}
