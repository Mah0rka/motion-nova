import { Modal, Table } from "../../../shared/ui";
import type { Payment } from "../../../shared/api";
import { paymentColumns } from "../lib/userColumns";

type PaymentsHistoryModalProps = {
  open: boolean;
  payments: Payment[];
  isLoading: boolean;
  errorMessage: string | null;
  onClose: () => void;
};

export function PaymentsHistoryModal({
  open,
  payments,
  isLoading,
  errorMessage,
  onClose
}: PaymentsHistoryModalProps) {
  return (
    <Modal
      open={open}
      title="Історія оплат учасника"
      description={`${payments.length} оплат`}
      size="lg"
      onClose={onClose}
    >
      {isLoading ? <p className="muted">Завантаження оплат...</p> : null}
      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

      <Table
        caption="Історія оплат учасника"
        columns={paymentColumns()}
        rows={payments}
        getRowKey={(payment) => payment.id}
        emptyTitle="Оплат ще немає"
        emptyDescription="Для цього учасника ще не зафіксовано оплат."
      />
    </Modal>
  );
}
