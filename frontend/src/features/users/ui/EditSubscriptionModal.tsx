import { Button, Modal } from "../../../shared/ui";
import type { MembershipPlan } from "../../../shared/api";
import type { SubscriptionFormState } from "../lib/userForms";
import { SubscriptionFormFields } from "./SubscriptionFormFields";

type EditSubscriptionModalProps = {
  open: boolean;
  form: SubscriptionFormState;
  activePlans: MembershipPlan[];
  onChange: (patch: Partial<SubscriptionFormState>) => void;
  onClose: () => void;
  onSubmit: () => void;
  pending: boolean;
  error: string | null;
};

export function EditSubscriptionModal({
  open,
  form,
  activePlans,
  onChange,
  onClose,
  onSubmit,
  pending,
  error
}: EditSubscriptionModalProps) {
  return (
    <Modal
      open={open}
      title="Редагування абонемента"
      size="md"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Скасувати</Button>
          <Button variant="secondary" disabled={pending} onClick={onSubmit}>
            {pending ? "Збереження..." : "Зберегти абонемент"}
          </Button>
        </>
      }
    >
      <SubscriptionFormFields
        form={form}
        onChange={onChange}
        planLabel="План"
        planOptions={activePlans.map((plan) => (
          <option key={plan.id} value={plan.id}>
            {plan.title}
          </option>
        ))}
        statusLabel="Статус"
        statusOptions={
          <>
            <option value="ACTIVE">Активний</option>
            <option value="FROZEN">На паузі</option>
            <option value="EXPIRED">Завершений</option>
          </>
        }
      />
      {error ? <p className="error-banner">{error}</p> : null}
    </Modal>
  );
}
