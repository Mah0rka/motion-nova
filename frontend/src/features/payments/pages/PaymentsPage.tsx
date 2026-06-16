import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getMyPayments, getPayments, queryKeys, type Payment } from "../../../shared/api";
import {
  Badge,
  DateRangeFilter,
  FormField,
  Input,
  ManagementTableCard,
  ManagementToolbar,
  PageHeader,
  Pagination,
  Select,
  Table,
  type TableColumn,
  useSearchPagination
} from "../../../shared/ui";
import { isoEnd, isoStart } from "../../../shared/lib/dateRange";
import { formatDateTime, formatMoney, fullName } from "../../../shared/lib/format";
import { useAuthStore } from "../../auth";
import { useBranchStore } from "../../branches/model/store";

function getPaymentStatusLabel(status: string): string {
  if (status === "SUCCESS") return "Підтверджено";
  if (status === "PENDING") return "Очікує підтвердження";
  return "Неуспішно";
}

function getMethodLabel(method: string): string {
  return method === "CASH" ? "Готівка" : "Картка";
}

export function PaymentsPage() {
  const user = useAuthStore((state) => state.user);
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  const isManagement = user?.role === "ADMIN" || user?.role === "OWNER";
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const startDate = fromDate ? isoStart(fromDate) : undefined;
  const endDate = toDate ? isoEnd(toDate) : undefined;

  const paymentsQuery = useQuery({
    queryKey: isManagement
      ? queryKeys.payments.ledger(selectedBranchId, null, statusFilter || null, methodFilter || null, startDate ?? null, endDate ?? null)
      : queryKeys.payments.mine(),
    queryFn: () =>
      isManagement
        ? getPayments({
            ...(statusFilter ? { status: statusFilter } : {}),
            ...(methodFilter ? { method: methodFilter } : {}),
            ...(startDate ? { startDate } : {}),
            ...(endDate ? { endDate } : {})
          })
        : getMyPayments()
  });

  const { filtered: filteredPayments, page, setPage, totalPages, pageItems } = useSearchPagination(
    paymentsQuery.data ?? [],
    searchTerm,
    (payment) =>
      payment.user
        ? `${payment.user.first_name} ${payment.user.last_name} ${payment.user.phone ?? ""}`
        : ""
  );

  const columns: TableColumn<Payment>[] = [
    {
      key: "amount",
      header: "Сума",
      render: (payment) => <strong>{formatMoney(payment.amount, payment.currency)}</strong>
    },
    ...(isManagement
      ? [{
          key: "branch",
          header: "Філія",
          render: (payment: Payment) => payment.branch?.name ?? "—"
        } satisfies TableColumn<Payment>]
      : []),
    {
      key: "method",
      header: "Метод",
      render: (payment) => getMethodLabel(payment.method)
    },
    {
      key: "status",
      header: "Статус",
      render: (payment) => getPaymentStatusLabel(payment.status)
    },
    {
      key: "subject",
      header: isManagement ? "Учасник" : "Призначення",
      className: "payments-subject-column",
      render: (payment) =>
        payment.user ? (
          <div className="ui-table-stack">
            <strong>{fullName(payment.user)}</strong>
            <span>{payment.user.phone ? `${payment.user.email} · ${payment.user.phone}` : payment.user.email}</span>
          </div>
        ) : (
          "Покупка абонемента"
        )
    },
    {
      key: "createdAt",
      header: "Дата",
      render: (payment) => formatDateTime(payment.created_at)
    }
  ];

  return (
    <section className="panel-stack payments-page">
      <PageHeader title={isManagement ? "Історія оплат клубу" : "Історія покупок"} />

      {isManagement ? (
        <ManagementToolbar
          search={
            <FormField label="Пошук">
              <Input
                aria-label="Пошук"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Ім'я, прізвище або телефон"
              />
            </FormField>
          }
          filters={
            <>
            <FormField label="Статус">
              <Select aria-label="Статус" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="">Усі</option>
                <option value="SUCCESS">Підтверджено</option>
                <option value="PENDING">Очікує підтвердження</option>
                <option value="FAILED">Неуспішно</option>
              </Select>
            </FormField>
            <FormField label="Метод">
              <Select aria-label="Метод" value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)}>
                <option value="">Усі</option>
                <option value="CARD">Картка</option>
                <option value="CASH">Готівка</option>
              </Select>
            </FormField>
            <DateRangeFilter
              from={fromDate}
              to={toDate}
              onFromChange={setFromDate}
              onToChange={setToDate}
              fieldClassName="payments-date-field"
            />
            </>
          }
          summary={<Badge>{filteredPayments.length} оплат</Badge>}
        />
      ) : null}

      {paymentsQuery.isLoading ? <p className="muted">Завантаження оплат...</p> : null}
      {paymentsQuery.isError ? (
        <p className="error-banner">
          {paymentsQuery.error instanceof Error ? paymentsQuery.error.message : "Помилка"}
        </p>
      ) : null}

      <ManagementTableCard>
        <Table
          caption={isManagement ? "Реєстр оплат клубу" : "Історія покупок"}
          columns={columns}
          rows={pageItems}
          getRowKey={(payment) => payment.id}
          emptyTitle="Покупок ще немає"
          emptyDescription="Після першого придбаного абонемента тут з’явиться історія оплат."
        />
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </ManagementTableCard>
    </section>
  );
}
