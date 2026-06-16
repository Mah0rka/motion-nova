import { cloneElement, isValidElement, useId, type PropsWithChildren, type ReactElement } from "react";

import { cx } from "../lib/cx";

type FieldControlProps = {
  id?: string;
  required?: boolean;
  "aria-describedby"?: string;
};

type FormFieldProps = PropsWithChildren<{
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
}>;

export function FormField({
  children,
  className,
  error,
  hint,
  htmlFor,
  label,
  required = false
}: FormFieldProps) {
  const generatedId = useId();
  const controlId = htmlFor ?? `field-${generatedId}`;
  const descriptionId = error || hint ? `${controlId}-description` : undefined;
  const control = isValidElement<FieldControlProps>(children)
    ? cloneElement(children as ReactElement<FieldControlProps>, {
        id: children.props.id ?? controlId,
        required: children.props.required ?? required,
        "aria-describedby": children.props["aria-describedby"] ?? descriptionId
      })
    : children;

  return (
    <div className={cx("ui-form-field", className)}>
      <label className={cx("ui-form-label", required && "ui-form-label-required")} htmlFor={controlId}>
        {label}
      </label>
      {control}
      {error ? <span className="ui-form-error" id={descriptionId}>{error}</span> : null}
      {!error && hint ? <span className="ui-form-hint" id={descriptionId}>{hint}</span> : null}
    </div>
  );
}
