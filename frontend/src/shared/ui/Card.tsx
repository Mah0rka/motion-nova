import type { HTMLAttributes, PropsWithChildren } from "react";

import { cx } from "../lib/cx";

type CardVariant = "default" | "muted" | "accent";

type CardProps = PropsWithChildren<
  HTMLAttributes<HTMLElement> & {
    as?: "article" | "section" | "div";
    variant?: CardVariant;
  }
>;

export function Card({
  as: Component = "article",
  children,
  className,
  variant = "default",
  ...props
}: CardProps) {
  return (
    <Component {...props} className={cx("ui-card", `ui-card-${variant}`, className)}>
      {children}
    </Component>
  );
}
