import type { HTMLAttributes, PropsWithChildren } from "react";

import { cx } from "../lib/cx";

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

type BadgeProps = PropsWithChildren<
  HTMLAttributes<HTMLSpanElement> & {
    tone?: BadgeTone;
  }
>;

export function Badge({ children, className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span {...props} className={cx("ui-badge", `ui-badge-${tone}`, className)}>
      {children}
    </span>
  );
}
