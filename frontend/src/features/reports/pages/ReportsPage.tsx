import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  compareBranches,
  comparePeriods,
  getClassOccupancy,
  getOverview,
  getPeakHours,
  getTrainerPerformance,
  queryKeys,
  type AnalyticsMetric,
  type ClassOccupancyRow
} from "../../../shared/api";
import {
  Card,
  DateRangeFilter,
  FormField,
  ManagementToolbar,
  PageHeader,
  Select,
  Table,
  type TableColumn
} from "../../../shared/ui";
import { isoEnd, isoStart, daysAgoInput, todayInput } from "../../../shared/lib/dateRange";
import { formatAmount, formatDateTime } from "../../../shared/lib/format";
import { useAuthStore } from "../../auth";
import { useBranchStore } from "../../branches/model/store";
import type {
  BranchComparisonRow,
  OverviewReport,
  TrainerPerformanceReport
} from "../../../shared/api";

const metricLabels: Record<AnalyticsMetric, string> = {
  REVENUE: "Дохід",
  EXPENSES: "Витрати",
  PROFIT: "Прибуток",
  VISITS: "Відвідування"
};

function money(value: number): string {
  return `₴${formatAmount(value)}`;
}

export function ReportsPage() {
  const user = useAuthStore((state) => state.user);
  const isOwner = user?.role === "OWNER";
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  const [fromDate, setFromDate] = useState(daysAgoInput(30));
  const [toDate, setToDate] = useState(todayInput());
  const [branchMetric, setBranchMetric] = useState<AnalyticsMetric>("REVENUE");

  const from = isoStart(fromDate);
  const to = isoEnd(toDate);
  const period = { from, to };

  const overviewQuery = useQuery({
    queryKey: queryKeys.analytics.overview(selectedBranchId, from, to),
    queryFn: () => getOverview(period)
  });

  const profitTrendQuery = useQuery({
    queryKey: queryKeys.analytics.comparePeriods("PROFIT", selectedBranchId, from, to),
    queryFn: () => comparePeriods("PROFIT", period)
  });

  const peakHoursQuery = useQuery({
    queryKey: queryKeys.analytics.peakHours(selectedBranchId, from, to),
    queryFn: () => getPeakHours(period)
  });

  const occupancyQuery = useQuery({
    queryKey: queryKeys.analytics.classOccupancy(selectedBranchId, from, to),
    queryFn: () => getClassOccupancy(period)
  });

  const trainersQuery = useQuery({
    queryKey: queryKeys.analytics.trainers(selectedBranchId),
    queryFn: () => getTrainerPerformance()
  });

  const branchCompareQuery = useQuery({
    queryKey: queryKeys.analytics.compareBranches(branchMetric, from, to),
    queryFn: () => compareBranches(branchMetric, period),
    enabled: isOwner
  });

  const overview = overviewQuery.data;
  const trend = profitTrendQuery.data;

  const peakHours = useMemo(
    () => (peakHoursQuery.data ?? []).filter((point) => point.visits > 0),
    [peakHoursQuery.data]
  );
  const peakMax = useMemo(
    () => peakHours.reduce((max, point) => Math.max(max, point.visits), 0),
    [peakHours]
  );

  const branchRows = useMemo(
    () => [...(branchCompareQuery.data ?? [])].sort((a, b) => b.value - a.value),
    [branchCompareQuery.data]
  );

  const overviewRows: OverviewReport[] = overview ? [overview] : [];

  const overviewColumns: TableColumn<OverviewReport>[] = [
    { key: "revenue", header: "Дохід", render: (row) => <strong>{money(row.revenue)}</strong> },
    { key: "expenses", header: "Витрати", render: (row) => money(row.expenses) },
    {
      key: "profit",
      header: "Прибуток",
      render: (row) => (
        <span className="report-metric-cell">
          <strong>{money(row.profit)}</strong>
          {trend && trend.delta_pct !== null ? (
            <span className="report-metric-delta">
              {trend.delta >= 0 ? "▲" : "▼"} {Math.abs(trend.delta_pct)}% vs попередній період
            </span>
          ) : null}
        </span>
      )
    },
    { key: "visits", header: "Відвідування", render: (row) => row.visits },
    { key: "active", header: "Активні абонементи", render: (row) => row.active_subscriptions }
  ];

  const branchColumns: TableColumn<BranchComparisonRow>[] = [
    { key: "branch", header: "Філія", render: (row) => <strong>{row.branch_name}</strong> },
    {
      key: "value",
      header: metricLabels[branchMetric],
      render: (row) => (branchMetric === "VISITS" ? row.value : money(row.value))
    }
  ];

  const trainerColumns: TableColumn<TrainerPerformanceReport>[] = [
    { key: "name", header: "Тренер", render: (row) => <strong>{row.name}</strong> },
    { key: "attendees", header: "Відвідувань", render: (row) => row.total_attendees },
    { key: "classes", header: "Занять", render: (row) => row.classes_taught },
    { key: "average", header: "Середнє на заняття", render: (row) => row.average_attendees_per_class }
  ];

  const occupancyColumns: TableColumn<ClassOccupancyRow>[] = [
    { key: "title", header: "Заняття", render: (row) => <strong>{row.title}</strong> },
    {
      key: "time",
      header: "Час",
      render: (row) => formatDateTime(row.start_time)
    },
    { key: "booked", header: "Записи", render: (row) => `${row.booked} / ${row.capacity}` },
    {
      key: "occupancy",
      header: "Заповненість",
      render: (row) => `${row.occupancy_pct}%`
    }
  ];

  return (
    <section className="panel-stack">
      <PageHeader title="Показники клубу" />

      <ManagementToolbar
        filters={
          <DateRangeFilter
            from={fromDate}
            to={toDate}
            onFromChange={setFromDate}
            onToChange={setToDate}
          />
        }
      />

      {overviewQuery.isError ? (
        <p className="error-banner">
          {overviewQuery.error instanceof Error ? overviewQuery.error.message : "Помилка"}
        </p>
      ) : null}

      <Card className="report-card">
        <Table
          caption="Зведення за період"
          columns={overviewColumns}
          rows={overviewRows}
          getRowKey={() => "overview"}
          emptyTitle="Немає даних за цей період"
        />
      </Card>

      <Card className="report-card">
        <div className="dashboard-section-heading">
          <div>
            <h2>Пікові години</h2>
          </div>
        </div>
        {peakHours.length ? (
          <div className="analytics-bars">
            {peakHours.map((point) => (
              <div className="bar-row" key={point.hour}>
                <span className="bar-label">{String(point.hour).padStart(2, "0")}:00</span>
                <span className="bar-track">
                  <span
                    className="bar-fill"
                    style={{ width: `${peakMax ? (point.visits / peakMax) * 100 : 0}%` }}
                  />
                </span>
                <span className="bar-value">{point.visits}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">За цей період відвідувань ще немає.</p>
        )}
      </Card>

      {isOwner ? (
        <Card className="report-card">
          <div className="dashboard-section-heading dashboard-section-heading--top">
            <div>
              <h2>Порівняння філій</h2>
            </div>
            <FormField label="Метрика">
              <Select
                aria-label="Метрика"
                value={branchMetric}
                onChange={(event) => setBranchMetric(event.target.value as AnalyticsMetric)}
              >
                {(Object.keys(metricLabels) as AnalyticsMetric[]).map((metric) => (
                  <option key={metric} value={metric}>
                    {metricLabels[metric]}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <Table
            caption="Порівняння філій"
            columns={branchColumns}
            rows={branchRows}
            getRowKey={(row) => row.branch_id}
            emptyTitle="Немає даних для порівняння"
          />
        </Card>
      ) : null}

      <Card className="report-card">
        <div className="dashboard-section-heading">
          <div>
            <h2>Популярність тренерів</h2>
          </div>
        </div>
        <Table
          caption="Популярність тренерів"
          columns={trainerColumns}
          rows={trainersQuery.data ?? []}
          getRowKey={(row) => row.trainer_id}
          emptyTitle="Даних про тренерів ще немає"
        />
      </Card>

      <Card className="report-card">
        <div className="dashboard-section-heading">
          <div>
            <h2>Заповнюваність занять</h2>
          </div>
        </div>
        <Table
          caption="Заповнюваність занять"
          columns={occupancyColumns}
          rows={occupancyQuery.data ?? []}
          getRowKey={(row) => row.class_id}
          emptyTitle="Занять за цей період немає"
          emptyDescription="Заняття з'являться тут після створення розкладу на цей період."
        />
      </Card>
    </section>
  );
}
