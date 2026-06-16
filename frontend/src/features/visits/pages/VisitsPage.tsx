import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getVisitHistory, queryKeys, type Visit } from "../../../shared/api";
import {
  DateRangeFilter,
  FormField,
  Input,
  ManagementTableCard,
  ManagementToolbar,
  PageHeader,
  Pagination,
  Table,
  type TableColumn,
  useSearchPagination
} from "../../../shared/ui";
import { daysAgoInput, isoEnd, isoStart, todayInput } from "../../../shared/lib/dateRange";
import { formatDateTime, fullName } from "../../../shared/lib/format";
import { useBranchStore } from "../../branches/model/store";

export function VisitsPage() {
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  const [fromDate, setFromDate] = useState(daysAgoInput(30));
  const [toDate, setToDate] = useState(todayInput());
  const [searchTerm, setSearchTerm] = useState("");

  const from = fromDate ? isoStart(fromDate) : undefined;
  const to = toDate ? isoEnd(toDate) : undefined;

  const historyQuery = useQuery({
    queryKey: queryKeys.visits.history(selectedBranchId, from, to),
    queryFn: () => getVisitHistory({ from, to })
  });

  const visits = useMemo(() => historyQuery.data ?? [], [historyQuery.data]);
  const { page, setPage, totalPages, pageItems } = useSearchPagination(visits, searchTerm, (visit) =>
    [
      fullName(visit.user),
      visit.user?.phone ?? "",
      visit.user?.email ?? "",
      visit.branch?.name ?? "",
      visit.workout_class?.title ?? "",
      fullName(visit.checked_in_by)
    ].join(" ")
  );

  const columns: TableColumn<Visit>[] = [
    {
      key: "client",
      header: "Клієнт",
      render: (visit) => (
        <div className="ui-table-stack">
          <strong>{fullName(visit.user)}</strong>
          <span>{visit.user?.phone ?? visit.user?.email}</span>
        </div>
      )
    },
    {
      key: "branch",
      header: "Філія",
      render: (visit) => visit.branch?.name ?? "—"
    },
    {
      key: "checkedIn",
      header: "Вхід",
      render: (visit) => formatDateTime(visit.checked_in_at)
    },
    {
      key: "checkedOut",
      header: "Вихід",
      render: (visit) =>
        visit.checked_out_at ? formatDateTime(visit.checked_out_at) : "У залі"
    },
    {
      key: "class",
      header: "Заняття",
      render: (visit) => visit.workout_class?.title ?? "—"
    },
    {
      key: "registeredBy",
      header: "Зареєстрував",
      render: (visit) => fullName(visit.checked_in_by)
    }
  ];

  return (
    <section className="panel-stack">
      <PageHeader title="Історія відвідувань" />

      <ManagementToolbar
        search={
          <FormField label="Пошук">
            <Input
              aria-label="Пошук"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Клієнт, телефон, email, філія або заняття"
            />
          </FormField>
        }
        filters={
          <DateRangeFilter
            from={fromDate}
            to={toDate}
            onFromChange={setFromDate}
            onToChange={setToDate}
          />
        }
      />

      {historyQuery.isError ? (
        <p className="error-banner">
          {historyQuery.error instanceof Error ? historyQuery.error.message : "Помилка"}
        </p>
      ) : null}

      <ManagementTableCard>
        <Table
          caption="Історія відвідувань"
          columns={columns}
          rows={pageItems}
          getRowKey={(visit) => visit.id}
          emptyTitle={searchTerm.trim() ? "Відвідувань не знайдено" : "За цей період відвідувань немає"}
          emptyDescription={
            searchTerm.trim()
              ? "Спробуйте змінити пошуковий запит або період."
              : "Змініть період або зареєструйте відвідування на сторінці рецепції."
          }
        />
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </ManagementTableCard>
    </section>
  );
}
