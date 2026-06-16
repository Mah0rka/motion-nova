import { Card } from "./Card";

export type StatCardProps = {
  label: string;
  value: string | number;
  note?: string;
  emphasis?: boolean;
};

export function StatCard({ label, value, note, emphasis = false }: StatCardProps) {
  const normalizedValue = String(value);

  return (
    <Card className="ui-stat-card" variant={emphasis ? "accent" : "default"}>
      <span className="ui-stat-label">{label}</span>
      <strong className={normalizedValue.length > 16 ? "ui-stat-value small" : "ui-stat-value"}>
        {normalizedValue}
      </strong>
      {note ? <span className="ui-stat-note">{note}</span> : null}
    </Card>
  );
}
