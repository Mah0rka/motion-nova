import type { ReactNode } from "react";

import { FormField, Input, Select } from "../../../shared/ui";
import type { EditableSubscriptionStatus, SubscriptionFormState } from "../lib/userForms";

type SubscriptionFormFieldsProps = {
  form: SubscriptionFormState;
  onChange: (patch: Partial<SubscriptionFormState>) => void;
  planLabel: string;
  planOptions: ReactNode;
  statusLabel: string;
  statusOptions: ReactNode;
};

export function SubscriptionFormFields({
  form,
  onChange,
  planLabel,
  planOptions,
  statusLabel,
  statusOptions
}: SubscriptionFormFieldsProps) {
  return (
    <div className="subscription-editor-grid">
      <FormField label={planLabel}>
        <Select value={form.plan_id} onChange={(event) => onChange({ plan_id: event.target.value })}>
          {planOptions}
        </Select>
      </FormField>
      <FormField label="Початок">
        <Input
          type="datetime-local"
          value={form.start_date}
          onChange={(event) => onChange({ start_date: event.target.value })}
        />
      </FormField>
      <FormField label="Кінець">
        <Input
          type="datetime-local"
          value={form.end_date}
          onChange={(event) => onChange({ end_date: event.target.value })}
        />
      </FormField>
      <FormField label={statusLabel}>
        <Select
          value={form.status}
          onChange={(event) => onChange({ status: event.target.value as EditableSubscriptionStatus })}
        >
          {statusOptions}
        </Select>
      </FormField>
      <FormField label="Всього відвідувань">
        <Input
          type="number"
          min={0}
          value={form.total_visits}
          onChange={(event) => onChange({ total_visits: event.target.value })}
        />
      </FormField>
      <FormField label="Залишилось відвідувань">
        <Input
          type="number"
          min={0}
          value={form.remaining_visits}
          onChange={(event) => onChange({ remaining_visits: event.target.value })}
        />
      </FormField>
    </div>
  );
}
