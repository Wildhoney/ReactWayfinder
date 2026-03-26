import Navigation from "../navigation";
import { Page, Hero, Body } from "./styles";
import type { Props } from "./types";

/** Detail page for a single feed post, showing a coloured hero and body text. */
export default function Post({ id, title }: Props) {
  const hue = (Number(id) * 47) % 360;

  return (
    <>
      <Navigation />
      <Page>
        <h1>{title}</h1>
        <Hero hue={hue} />
        <Body>
          This is the detail page for post #{id}. Navigate back to the feed to
          verify your scroll position and loaded items are preserved.
        </Body>
      </Page>
    </>
  );
}
