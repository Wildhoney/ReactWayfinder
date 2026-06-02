import type { ReactElement } from "react";
import { Skeleton } from "antd";
import Navigation from "../../navigation";
import { Page } from "./styles";

/** Placeholder skeleton shown while the user profile `data` function is in flight. */
export default function UserSkeleton(): ReactElement {
  return (
    <>
      <Navigation />
      <Page>
        <Skeleton avatar active paragraph={{ rows: 3 }} />
      </Page>
    </>
  );
}
