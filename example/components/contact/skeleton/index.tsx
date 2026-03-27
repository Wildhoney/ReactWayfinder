import type { ReactElement } from "react";
import { Skeleton } from "antd";

export default function ContactSkeleton(): ReactElement {
  return (
    <>
      <h2>Postal</h2>
      <Skeleton active title={false} paragraph={{ rows: 2 }} />
    </>
  );
}
