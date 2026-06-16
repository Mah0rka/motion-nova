import type { MembershipPlan, Subscription } from "../../../shared/api";
import { Button, type TableColumn } from "../../../shared/ui";
import { formatDate, formatMoney } from "../../../shared/lib/format";
import {
  getPlanMeta,
  getPlanStatus,
  getPlanTypeLabel,
  getSubscriptionStatusLabel
} from "./subscriptionLabels";

function planTitleCell(plan: MembershipPlan) {
  return (
    <div className="ui-table-stack">
      <strong>{plan.title}</strong>
      {plan.description ? <span>{plan.description}</span> : null}
    </div>
  );
}

function rowArrow(label: string, onClick: () => void) {
  return (
    <button type="button" className="subscription-row-arrow" aria-label={label} onClick={onClick}>
      ›
    </button>
  );
}

export function managementPlanColumns(onEdit: (plan: MembershipPlan) => void): TableColumn<MembershipPlan>[] {
  return [
    { key: "title", header: "Назва", render: planTitleCell },
    { key: "type", header: "Тип", render: (plan) => getPlanTypeLabel(plan.type) },
    { key: "meta", header: "Параметри", render: getPlanMeta },
    {
      key: "price",
      header: "Ціна",
      render: (plan) => <strong>{formatMoney(plan.price, plan.currency)}</strong>
    },
    { key: "status", header: "Статус", render: (plan) => getPlanStatus(plan).label },
    {
      key: "actions",
      header: "",
      className: "subscription-actions-cell",
      render: (plan) => rowArrow("Редагувати", () => onEdit(plan))
    }
  ];
}

type ClientPlanColumnsOptions = {
  onPurchase: (planId: string) => void;
  purchasePending: boolean;
  blocked: boolean;
};

export function clientPlanColumns({
  onPurchase,
  purchasePending,
  blocked
}: ClientPlanColumnsOptions): TableColumn<MembershipPlan>[] {
  return [
    { key: "title", header: "Назва", render: planTitleCell },
    { key: "meta", header: "Параметри", render: getPlanMeta },
    {
      key: "actions",
      header: "",
      className: "subscription-actions-cell",
      render: (plan) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPurchase(plan.id)}
          disabled={purchasePending || blocked || !plan.is_active}
        >
          {purchasePending
            ? "Оформлення..."
            : !plan.is_active
              ? "План вимкнено"
              : blocked
                ? "Спочатку завершіть поточний план"
                : "Купити абонемент"}
        </Button>
      )
    }
  ];
}

type OwnedSubscriptionColumnsOptions = {
  onFreeze: (subscriptionId: string) => void;
  onUnfreeze: (subscriptionId: string) => void;
  unfreezePending: boolean;
};

export function ownedSubscriptionColumns({
  onFreeze,
  onUnfreeze,
  unfreezePending
}: OwnedSubscriptionColumnsOptions): TableColumn<Subscription>[] {
  return [
    {
      key: "plan",
      header: "План",
      render: (subscription) => <strong>{subscription.plan?.title ?? "План недоступний"}</strong>
    },
    {
      key: "period",
      header: "Період",
      render: (subscription) => `${formatDate(subscription.start_date)} – ${formatDate(subscription.end_date)}`
    },
    {
      key: "remaining",
      header: "Залишилось відвідувань",
      render: (subscription) => subscription.remaining_visits ?? "∞"
    },
    {
      key: "status",
      header: "Статус",
      render: (subscription) => getSubscriptionStatusLabel(subscription.status)
    },
    {
      key: "actions",
      header: "",
      className: "subscription-actions-cell",
      render: (subscription) => {
        if (subscription.status === "ACTIVE") {
          return (
            <Button variant="ghost" size="sm" onClick={() => onFreeze(subscription.id)}>
              Заморозити
            </Button>
          );
        }
        if (subscription.status === "FROZEN") {
          return (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onUnfreeze(subscription.id)}
              disabled={unfreezePending}
            >
              {unfreezePending ? "Розморожування..." : "Розморозити"}
            </Button>
          );
        }
        return null;
      }
    }
  ];
}
