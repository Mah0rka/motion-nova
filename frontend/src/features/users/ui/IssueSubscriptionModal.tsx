import { Button, Modal } from "../../../shared/ui";
import type { MembershipPlan } from "../../../shared/api";
import { getPlanTypeLabel } from "../../subscriptions/lib/subscriptionLabels";
import type { SubscriptionFormState } from "../lib/userForms";
import { SubscriptionFormFields } from "./SubscriptionFormFields";

type IssueSubscriptionModalProps = {
  open: boolean;
  form: SubscriptionFormState;
  activePlans: MembershipPlan[];
  onChange: (patch: Partial<SubscriptionFormState>) => void;
  onClose: () => void;
  onSubmit: () => void;
  pending: boolean;
  error: string | null;
};

export function IssueSubscriptionModal({
  open,
  form,
  activePlans,
  onChange,
  onClose,
  onSubmit,
  pending,
  error
}: IssueSubscriptionModalProps) {
  return (
    <Modal
      open={open}
      title="Видати абонемент"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Скасувати</Button>
          <Button variant="secondary" disabled={pending || !form.plan_id} onClick={onSubmit}>
            {pending ? "Видача..." : "Видати абонемент"}
          </Button>
        </>
      }
    >
      <SubscriptionFormFields
        form={form}
        onChange={onChange}
        planLabel="Абонемент для видачі"
        planOptions={
          <>
            <option value="">Оберіть план</option>
            {activePlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.title} · {getPlanTypeLabel(plan.type)} · {plan.is_public ? "публічний" : "непублічний"}
              </option>
            ))}
          </>
        }
        statusLabel="Статус для видачі"
        statusOptions={
          <>
            <option value="ACTIVE">Активний</option>
            <option value="EXPIRED">Завершений</option>
          </>
        }
      />
      {error ? <p className="error-banner">{error}</p> : null}
    </Modal>
  );
}
