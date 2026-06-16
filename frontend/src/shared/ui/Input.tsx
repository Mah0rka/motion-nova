import type { InputHTMLAttributes } from "react";

import { cx } from "../lib/cx";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export function Input({ className, invalid = false, ...props }: InputProps) {
  return (
    <input
      {...props}
      className={cx("ui-input", invalid && "ui-control-invalid", className)}
      aria-invalid={invalid || undefined}
    />
  );
}
