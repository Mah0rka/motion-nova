import { useEffect, type PropsWithChildren, type ReactNode } from "react";

import { cx } from "../lib/cx";
import { Button } from "./Button";

type ModalSize = "sm" | "md" | "lg";

type ModalProps = PropsWithChildren<{
  open: boolean;
  title: string;
  description?: string;
  footer?: ReactNode;
  size?: ModalSize;
  onClose: () => void;
}>;

export function Modal({
  children,
  description,
  footer,
  onClose,
  open,
  size = "md",
  title
}: ModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="ui-modal-overlay" role="presentation" onClick={onClose}>
      <section
        aria-modal="true"
        aria-label={title}
        className={cx("ui-modal", `ui-modal-${size}`)}
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ui-modal-header">
          <div>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <Button variant="ghost" size="sm" aria-label="Закрити" onClick={onClose}>
            ✕
          </Button>
        </header>
        <div className="ui-modal-body">{children}</div>
        {footer ? <footer className="ui-modal-footer">{footer}</footer> : null}
      </section>
    </div>
  );
}
