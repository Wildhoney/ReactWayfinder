import { Skeleton } from "antd";
import Navigation from "../../navigation";
import { Page } from "./styles";

/** Placeholder skeleton shown while the user profile loader is in flight. */
export default function UserSkeleton() {
  return (
    <>
      <Navigation />
      <Page>
        <Skeleton avatar active paragraph={{ rows: 3 }} />
      </Page>
    </>
  );
}
