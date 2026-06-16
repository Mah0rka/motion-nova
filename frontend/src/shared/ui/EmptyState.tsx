import type { ReactNode } from "react";

import { cx } from "../lib/cx";

type EmptyStateProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export function EmptyState({ actions, className, description, title }: EmptyStateProps) {
  return (
    <div className={cx("ui-empty-state", className)}>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {actions ? <div className="ui-empty-state-actions">{actions}</div> : null}
    </div>
  );
}
