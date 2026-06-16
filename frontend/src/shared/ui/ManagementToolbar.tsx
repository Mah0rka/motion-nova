import type { ReactNode } from "react";

import { cx } from "../lib/cx";
import { Card } from "./Card";

type ManagementToolbarProps = {
  search?: ReactNode;
  filters?: ReactNode;
  tabs?: ReactNode;
  actions?: ReactNode;
  summary?: ReactNode;
  className?: string;
};

export function ManagementToolbar({
  actions,
  className,
  filters,
  search,
  summary,
  tabs
}: ManagementToolbarProps) {
  return (
    <Card as="section" className={cx("ui-management-toolbar", className)} variant="muted">
      <div className="ui-management-toolbar-main">
        {search ? <div className="ui-management-toolbar-search">{search}</div> : null}
        {filters ? <div className="ui-management-toolbar-filters">{filters}</div> : null}
      </div>
      {tabs || actions || summary ? (
        <div className="ui-management-toolbar-side">
          {tabs ? <div className="ui-management-toolbar-tabs">{tabs}</div> : null}
          {summary ? <div className="ui-management-toolbar-summary">{summary}</div> : null}
          {actions ? <div className="ui-management-toolbar-actions">{actions}</div> : null}
        </div>
      ) : null}
    </Card>
  );
}
