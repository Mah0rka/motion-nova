import { Button, FormField, Input, Modal } from "../../../shared/ui";

type FreezeModalProps = {
  open: boolean;
  days: number;
  onDaysChange: (days: number) => void;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
  error: string | null;
};

export function FreezeModal({ open, days, onDaysChange, onClose, onConfirm, pending, error }: FreezeModalProps) {
  return (
    <Modal
      open={open}
      title="Заморозити абонемент"
      description="Вкажіть термін паузи. Допустимий діапазон — від 7 до 30 днів."
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Скасувати</Button>
          <Button variant="secondary" onClick={onConfirm} disabled={pending}>
            {pending ? "Оновлення..." : "Підтвердити заморозку"}
          </Button>
        </>
      }
    >
      <FormField label="Кількість днів заморозки">
        <Input
          type="number"
          min={7}
          max={30}
          value={days}
          onChange={(event) => onDaysChange(Number(event.target.value))}
        />
      </FormField>
      {error ? <p className="error-banner">{error}</p> : null}
    </Modal>
  );
}
