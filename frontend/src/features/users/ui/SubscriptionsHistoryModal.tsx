import { Modal, Table } from "../../../shared/ui";
import type { Subscription } from "../../../shared/api";
import { subscriptionColumns } from "../lib/userColumns";

type SubscriptionsHistoryModalProps = {
  open: boolean;
  subscriptions: Subscription[];
  isLoading: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onEditSubscription: (subscription: Subscription) => void;
};

export function SubscriptionsHistoryModal({
  open,
  subscriptions,
  isLoading,
  errorMessage,
  onClose,
  onEditSubscription
}: SubscriptionsHistoryModalProps) {
  return (
    <Modal
      open={open}
      title="Історія придбаних абонементів"
      description={`${subscriptions.length} записів`}
      size="lg"
      onClose={onClose}
    >
      {isLoading ? <p className="muted">Завантаження абонементів...</p> : null}
      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

      <Table
        caption="Історія придбаних абонементів"
        columns={subscriptionColumns(onEditSubscription)}
        rows={subscriptions}
        getRowKey={(subscription) => subscription.id}
        emptyTitle="Абонементів ще немає"
        emptyDescription="Цьому учаснику ще не видавали абонементів."
      />
    </Modal>
  );
}
