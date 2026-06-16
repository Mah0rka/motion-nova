import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { Link, type LinkProps } from "react-router-dom";

import { cx } from "../lib/cx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
  }
>;

type ButtonLinkProps = PropsWithChildren<
  LinkProps & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
  }
>;

function buttonClassName(
  variant: ButtonVariant,
  size: ButtonSize,
  fullWidth: boolean | undefined,
  className: string | undefined
): string {
  return cx(
    "ui-button",
    `ui-button-${variant}`,
    `ui-button-${size}`,
    fullWidth && "ui-button-full",
    className
  );
}

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  fullWidth,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={buttonClassName(variant, size, fullWidth, className)}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  children,
  className,
  variant = "primary",
  size = "md",
  fullWidth,
  ...props
}: ButtonLinkProps) {
  return (
    <Link {...props} className={buttonClassName(variant, size, fullWidth, className)}>
      {children}
    </Link>
  );
}
