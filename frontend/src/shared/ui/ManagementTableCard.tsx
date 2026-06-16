import type { PropsWithChildren } from "react";

import { cx } from "../lib/cx";
import { Card } from "./Card";

type ManagementTableCardProps = PropsWithChildren<{
  className?: string;
  title?: string;
}>;

export function ManagementTableCard({ children, className, title }: ManagementTableCardProps) {
  return (
    <Card as="section" className={cx("ui-management-table-card", className)}>
      {title ? <h3 className="ui-management-table-title">{title}</h3> : null}
      {children}
    </Card>
  );
}
