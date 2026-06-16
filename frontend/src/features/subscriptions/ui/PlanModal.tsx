import { Button, FormField, Input, Modal, Select } from "../../../shared/ui";
import type { PlanFormState } from "../lib/planForm";

type PlanModalProps = {
  open: boolean;
  isEditing: boolean;
  form: PlanFormState;
  onChange: (patch: Partial<PlanFormState>) => void;
  onClose: () => void;
  onSubmit: () => void;
  onDelete: () => void;
  savePending: boolean;
  deletePending: boolean;
  error: string | null;
};

export function PlanModal({
  open,
  isEditing,
  form,
  onChange,
  onClose,
  onSubmit,
  onDelete,
  savePending,
  deletePending,
  error
}: PlanModalProps) {
  return (
    <Modal
      open={open}
      title={isEditing ? "Редагування абонемента" : "Новий абонемент"}
      size="lg"
      onClose={onClose}
      footer={
        <div className="subscription-modal-footer">
          {isEditing ? (
            <Button variant="danger" onClick={onDelete} disabled={deletePending}>
              {deletePending ? "Видалення..." : "Видалити"}
            </Button>
          ) : (
            <span />
          )}
          <div className="subscription-modal-footer-actions">
            <Button variant="ghost" onClick={onClose}>Скасувати</Button>
            <Button
              variant="secondary"
              onClick={onSubmit}
              disabled={savePending || !form.title || !form.duration_days || !form.price}
            >
              {isEditing
                ? savePending ? "Збереження..." : "Зберегти абонемент"
                : savePending ? "Створення..." : "Створити абонемент"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="subscription-editor-grid">
        <FormField label="Назва" required>
          <Input value={form.title} onChange={(event) => onChange({ title: event.target.value })} />
        </FormField>
        <FormField label="Опис">
          <Input value={form.description} onChange={(event) => onChange({ description: event.target.value })} />
        </FormField>
        <FormField label="Тип">
          <Select
            value={form.type}
            onChange={(event) => onChange({ type: event.target.value as PlanFormState["type"] })}
          >
            <option value="MONTHLY">Місячний</option>
            <option value="YEARLY">Річний</option>
            <option value="PAY_AS_YOU_GO">Разове відвідування</option>
          </Select>
        </FormField>
        <FormField label="Тривалість, днів">
          <Input
            type="number"
            min={1}
            value={form.duration_days}
            onChange={(event) => onChange({ duration_days: Number(event.target.value) })}
          />
        </FormField>
        <FormField label="Ліміт відвідувань" hint="0 означає безлімітний план">
          <Input
            type="number"
            min={0}
            value={form.visits_limit ?? 0}
            onChange={(event) => onChange({ visits_limit: Number(event.target.value) })}
          />
        </FormField>
        <FormField label="Ціна">
          <Input
            type="number"
            min={1}
            step="0.01"
            value={form.price}
            onChange={(event) => onChange({ price: Number(event.target.value) })}
          />
        </FormField>
      </div>

      <div className="subscription-checkboxes">
        <label className="ui-checkbox-field">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) => onChange({ is_active: event.target.checked })}
          />
          План активний
        </label>
        <label className="ui-checkbox-field">
          <input
            type="checkbox"
            checked={form.is_public}
            onChange={(event) => onChange({ is_public: event.target.checked })}
          />
          Публічний план для сайту та покупки
        </label>
      </div>

      {error ? <p className="error-banner">{error}</p> : null}
    </Modal>
  );
}
