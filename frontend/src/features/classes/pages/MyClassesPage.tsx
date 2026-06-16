import { useEffect, useMemo, useState } from "react";
import type { Schedule } from "../../../shared/api";
import { hasSessionEnded } from "../../../shared/lib/sessionTime";
import { formatDateTime, fullName } from "../../../shared/lib/format";
import {
  Badge,
  Button,
  FormField,
  Input,
  ManagementTableCard,
  ManagementToolbar,
  Modal,
  PageHeader,
  Pagination,
  Select,
  Table,
  useSearchPagination
} from "../../../shared/ui";
import type { TableColumn } from "../../../shared/ui";
import { useAuthStore } from "../../auth";
import { useClassesPageData } from "../hooks/useClassesPageData";

function formatSessionPeriod(startTime: string, endTime: string): string {
  return `${formatDateTime(startTime)} - ${formatDateTime(endTime)}`;
}

export function MyClassesPage() {
  const user = useAuthStore((state) => state.user);
  const isManagement = user?.role === "ADMIN" || user?.role === "OWNER";
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [view, setView] = useState<"ACTIVE" | "PENDING" | "HISTORY">("ACTIVE");
  const [completionComment, setCompletionComment] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const { classesQuery, attendeesQuery, completeMutation } = useClassesPageData({
    isManagement,
    selectedClassId
  });

  const visibleClasses = useMemo(() => {
    const classes = classesQuery.data ?? [];
    const activeClasses = classes
      .filter((item) => !hasSessionEnded(item.end_time))
      .sort((left, right) => +new Date(left.start_time) - +new Date(right.start_time));
    const pendingClasses = classes
      .filter((item) => hasSessionEnded(item.end_time) && !item.completed_at)
      .sort((left, right) => +new Date(right.end_time) - +new Date(left.end_time));
    const historyClasses = classes
      .filter((item) => hasSessionEnded(item.end_time) && (!isManagement || Boolean(item.completed_at)))
      .sort((left, right) => +new Date(right.end_time) - +new Date(left.end_time));

    if (view === "ACTIVE") {
      return activeClasses;
    }

    if (view === "PENDING") {
      return pendingClasses;
    }

    return historyClasses;
  }, [classesQuery.data, isManagement, view]);

  const dateFilteredClasses = useMemo(
    () =>
      visibleClasses.filter(
        (item) => !dateFilter || new Date(item.start_time).toLocaleDateString("en-CA") === dateFilter
      ),
    [dateFilter, visibleClasses]
  );

  const { filtered: filteredClasses, page, setPage, totalPages, pageItems } = useSearchPagination(
    dateFilteredClasses,
    searchTerm,
    (item) => item.title
  );

  const selectedClass = useMemo(
    () => filteredClasses.find((item) => item.id === selectedClassId) ?? null,
    [filteredClasses, selectedClassId]
  );

  useEffect(() => {
    setCompletionComment(selectedClass?.completion_comment ?? "");
  }, [selectedClass?.completion_comment, selectedClass?.id]);

  const canConfirmCompletion =
    Boolean(selectedClass) &&
    Boolean(user) &&
    hasSessionEnded(selectedClass!.end_time) &&
    (isManagement || selectedClass?.trainer_id === user?.id);

  const headingTitle = isManagement ? "Заняття клубу та історія" : "Мої заняття та учасники";

  const columns = useMemo<TableColumn<Schedule>[]>(() => {
    const list: TableColumn<Schedule>[] = [
      {
        key: "title",
        header: "Заняття",
        render: (item) => <strong>{item.title}</strong>
      },
      {
        key: "period",
        header: "Період",
        render: (item) => formatSessionPeriod(item.start_time, item.end_time)
      }
    ];

    if (isManagement) {
      list.push({
        key: "trainer",
        header: "Тренер",
        render: (item) => fullName(item.trainer)
      });
    }

    list.push({
      key: "confirmed",
      header: "Підтверджено",
      render: (item) => {
        const confirmedCount = item.bookings.filter((booking) => booking.status === "CONFIRMED").length;
        return `${confirmedCount}/${item.capacity}`;
      }
    });

    if (view !== "ACTIVE") {
      list.push({
        key: "status",
        header: "Статус",
        render: (item) => (item.completed_at ? "Підтверджено" : "Очікує підтвердження")
      });
    }

    list.push({
      key: "actions",
      header: "",
      className: "classes-action-cell",
      render: (item) => (
        <button
          type="button"
          className="subscription-row-arrow"
          aria-label="Деталі заняття"
          onClick={() => setSelectedClassId(item.id)}
        >
          ›
        </button>
      )
    });

    return list;
  }, [isManagement, view]);

  const emptyState = visibleClasses.length
    ? { title: "Нічого не знайдено", description: "Змініть пошук або фільтр дати." }
    : view === "ACTIVE"
      ? {
          title: isManagement ? "У клубі немає активних занять" : "У вас немає актуальних занять",
          description: undefined
        }
      : view === "PENDING"
        ? { title: "Усі завершені заняття вже підтверджені", description: undefined }
        : { title: "Історія занять поки порожня", description: undefined };

  const detailDescription = selectedClass
    ? `${formatSessionPeriod(selectedClass.start_time, selectedClass.end_time)} · Тренер: ${fullName(selectedClass.trainer)}`
    : undefined;

  return (
    <section className="panel-stack classes-page">
      <PageHeader title={headingTitle} />

      <ManagementToolbar
        search={
          <FormField label="Пошук">
            <Input
              aria-label="Пошук"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Назва заняття"
            />
          </FormField>
        }
        filters={
          <>
            <FormField label="Дата">
              <Input
                aria-label="Дата"
                type="date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
              />
            </FormField>
            <FormField label="Список">
              <Select
                aria-label="Список"
                value={view}
                onChange={(event) => setView(event.target.value as "ACTIVE" | "PENDING" | "HISTORY")}
              >
                <option value="ACTIVE">Актуальні</option>
                {isManagement ? <option value="PENDING">Очікує підтвердження</option> : null}
                <option value="HISTORY">Історія</option>
              </Select>
            </FormField>
          </>
        }
        summary={<Badge>{filteredClasses.length} занять</Badge>}
      />

      {classesQuery.isLoading ? <p className="muted">Завантаження занять...</p> : null}
      {classesQuery.isError ? (
        <p className="error-banner">
          {classesQuery.error instanceof Error ? classesQuery.error.message : "Помилка"}
        </p>
      ) : null}

      <ManagementTableCard>
        <Table
          caption={headingTitle}
          columns={columns}
          rows={pageItems}
          getRowKey={(item) => item.id}
          emptyTitle={emptyState.title}
          emptyDescription={emptyState.description}
        />
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </ManagementTableCard>

      <Modal
        open={Boolean(selectedClass)}
        title={selectedClass?.title ?? "Заняття"}
        description={detailDescription}
        size="md"
        onClose={() => setSelectedClassId(null)}
        footer={
          selectedClass && view !== "ACTIVE" && canConfirmCompletion ? (
            <Button
              variant="secondary"
              disabled={completeMutation.isPending}
              onClick={() =>
                completeMutation.mutate({
                  classId: selectedClass.id,
                  comment: completionComment
                })
              }
            >
              {completeMutation.isPending
                ? "Збереження..."
                : selectedClass.completed_at
                  ? "Оновити коментар"
                  : "Підтвердити завершення"}
            </Button>
          ) : undefined
        }
      >
        {completeMutation.isError ? (
          <p className="error-banner">
            {completeMutation.error instanceof Error
              ? completeMutation.error.message
              : "Не вдалося підтвердити завершення заняття."}
          </p>
        ) : null}

        {selectedClass && view !== "ACTIVE" && canConfirmCompletion ? (
          <div className="create-panel-field classes-completion-form">
            <label htmlFor="completion-comment">Коментар після заняття</label>
            <textarea
              id="completion-comment"
              rows={4}
              value={completionComment}
              onChange={(event) => setCompletionComment(event.target.value)}
            />
          </div>
        ) : null}

        <h3 className="classes-attendees-title">Учасники заняття</h3>
        {attendeesQuery.isLoading ? <p className="muted">Завантаження учасників...</p> : null}
        {attendeesQuery.isError ? (
          <p className="error-banner">
            {attendeesQuery.error instanceof Error ? attendeesQuery.error.message : "Помилка"}
          </p>
        ) : null}
        {!attendeesQuery.isLoading && !attendeesQuery.data?.length ? (
          <p className="muted">Поки немає підтверджених учасників.</p>
        ) : null}

        <div className="table-grid classes-attendees-grid">
          {attendeesQuery.data?.map((attendee) => (
            <article key={attendee.id} className="table-row classes-attendee-row">
              <div>
                <strong>
                  {fullName(attendee.user)}
                </strong>
                <p className="muted">{attendee.user.email}</p>
              </div>
              <span>Підтверджено</span>
            </article>
          ))}
        </div>
      </Modal>
    </section>
  );
}
