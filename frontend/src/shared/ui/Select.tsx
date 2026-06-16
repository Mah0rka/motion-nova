import type { SelectHTMLAttributes } from "react";

import { cx } from "../lib/cx";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
};

export function Select({ children, className, invalid = false, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={cx("ui-select", invalid && "ui-control-invalid", className)}
      aria-invalid={invalid || undefined}
    >
      {children}
    </select>
  );
}
