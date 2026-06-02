import type { ReactElement } from "react";
import { Skeleton } from "antd";
import Navigation from "../../navigation";
import { Page, HeroPlaceholder } from "./styles";

/** Placeholder skeleton shown while the post detail `data` function is in flight. */
export default function PostSkeleton(): ReactElement {
  return (
    <>
      <Navigation />
      <Page>
        <Skeleton active title={{ width: "40%" }} paragraph={false} />
        <HeroPlaceholder />
        <Skeleton active paragraph={{ rows: 2 }} title={false} />
      </Page>
    </>
  );
}
