import { FormField } from "./FormField";
import { Input } from "./Input";

type DateRangeFilterProps = {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  fromLabel?: string;
  toLabel?: string;
  fieldClassName?: string;
};

export function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  fromLabel = "Період з",
  toLabel = "Період по",
  fieldClassName
}: DateRangeFilterProps) {
  return (
    <>
      <FormField label={fromLabel} className={fieldClassName}>
        <Input
          type="date"
          aria-label={fromLabel}
          value={from}
          onChange={(event) => onFromChange(event.target.value)}
        />
      </FormField>
      <FormField label={toLabel} className={fieldClassName}>
        <Input
          type="date"
          aria-label={toLabel}
          value={to}
          onChange={(event) => onToChange(event.target.value)}
        />
      </FormField>
    </>
  );
}
