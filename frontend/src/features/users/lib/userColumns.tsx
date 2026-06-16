import type { CurrentUser, Payment, Subscription } from "../../../shared/api";
import { type TableColumn } from "../../../shared/ui";
import { formatDate, formatDateTime, formatMoney, fullName } from "../../../shared/lib/format";
import { getPlanTypeLabel, getSubscriptionStatusLabel } from "../../subscriptions/lib/subscriptionLabels";
import { getAccessLabel } from "./userForms";

function rowArrow(label: string, onClick: () => void) {
  return (
    <button type="button" className="subscription-row-arrow" aria-label={label} onClick={onClick}>
      ›
    </button>
  );
}

export function userColumns(
  subscriptionsByUser: Map<string, Subscription>,
  onSelect: (user: CurrentUser) => void
): TableColumn<CurrentUser>[] {
  return [
    {
      key: "participant",
      header: "Учасник",
      render: (user) => (
        <div className="ui-table-stack">
          <strong>{fullName(user)}</strong>
        </div>
      )
    },
    {
      key: "contacts",
      header: "Контакти",
      render: (user) => (
        <div className="ui-table-stack">
          <span>{user.email}</span>
          <span>{user.phone || "Телефон не вказано"}</span>
        </div>
      )
    },
    {
      key: "subscription",
      header: "Абонемент",
      render: (user) => {
        const userSubscription = subscriptionsByUser.get(user.id);
        return userSubscription ? (
          <div className="ui-table-stack">
            <strong>{userSubscription.plan?.title ?? getSubscriptionStatusLabel(userSubscription.status)}</strong>
            <span>{getSubscriptionStatusLabel(userSubscription.status)}</span>
          </div>
        ) : (
          <span className="muted">Немає абонемента</span>
        );
      }
    },
    {
      key: "access",
      header: "Доступ",
      render: (user) => getAccessLabel(user.role)
    },
    {
      key: "createdAt",
      header: "Створено",
      render: (user) => formatDate(user.created_at)
    },
    {
      key: "actions",
      header: "",
      className: "subscription-actions-cell",
      render: (user) => rowArrow("Редагувати", () => onSelect(user))
    }
  ];
}

export function subscriptionColumns(onEdit: (subscription: Subscription) => void): TableColumn<Subscription>[] {
  return [
    {
      key: "plan",
      header: "Абонемент",
      render: (subscription) => (
        <div className="ui-table-stack">
          <strong>{subscription.plan?.title ?? "План недоступний"}</strong>
          <span>
            {subscription.plan
              ? `${getPlanTypeLabel(subscription.plan.type)} · ${formatMoney(subscription.plan.price, subscription.plan.currency)}`
              : "План недоступний"}
          </span>
        </div>
      )
    },
    {
      key: "period",
      header: "Період",
      render: (subscription) => (
        <div className="ui-table-stack">
          <span>{formatDate(subscription.start_date)}</span>
          <span>{formatDate(subscription.end_date)}</span>
        </div>
      )
    },
    {
      key: "status",
      header: "Статус",
      render: (subscription) => getSubscriptionStatusLabel(subscription.status)
    },
    {
      key: "visits",
      header: "Відвідування",
      render: (subscription) => `${subscription.remaining_visits ?? "∞"} / ${subscription.total_visits ?? "∞"}`
    },
    {
      key: "actions",
      header: "",
      className: "subscription-actions-cell",
      render: (subscription) => rowArrow("Редагувати абонемент", () => onEdit(subscription))
    }
  ];
}

export function paymentColumns(): TableColumn<Payment>[] {
  return [
    {
      key: "amount",
      header: "Сума",
      render: (payment) => <strong>{formatMoney(payment.amount, payment.currency)}</strong>
    },
    {
      key: "method",
      header: "Метод",
      render: (payment) => (payment.method === "CASH" ? "Готівка" : "Картка")
    },
    {
      key: "status",
      header: "Статус",
      render: (payment) => (payment.status === "SUCCESS" ? "Підтверджено" : "Неуспішно")
    },
    {
      key: "createdAt",
      header: "Дата",
      render: (payment) => formatDateTime(payment.created_at)
    }
  ];
}
