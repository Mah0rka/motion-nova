import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  checkInVisit,
  checkOutVisit,
  getActiveVisits,
  getCheckInBookings,
  getUsers,
  queryKeys,
  type CurrentUser,
  type Visit
} from "../../../shared/api";
import {
  Button,
  FormField,
  Input,
  ManagementTableCard,
  ManagementToolbar,
  PageHeader,
  Select,
  Table,
  type TableColumn
} from "../../../shared/ui";
import { fullName } from "../../../shared/lib/format";
import { filterBySearch } from "../../../shared/lib/search";
import { useBranchStore } from "../../branches/model/store";

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });
}

type CheckInClientRow = {
  client: CurrentUser;
};

export function CheckInPage() {
  const queryClient = useQueryClient();
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  const [view, setView] = useState<"check-in" | "active">("check-in");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearchTerm, setActiveSearchTerm] = useState("");
  const [openMenuClientId, setOpenMenuClientId] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const clientsQuery = useQuery({
    queryKey: queryKeys.users.list("CLIENT"),
    queryFn: () => getUsers("CLIENT")
  });

  const activeQuery = useQuery({
    queryKey: queryKeys.visits.active(selectedBranchId),
    queryFn: () => getActiveVisits()
  });

  const bookingsQuery = useQuery({
    queryKey: queryKeys.visits.checkInBookings(selectedBranchId, openMenuClientId),
    queryFn: () => getCheckInBookings(openMenuClientId as string),
    enabled: Boolean(openMenuClientId && selectedBranchId)
  });

  const activeVisits = useMemo(() => activeQuery.data ?? [], [activeQuery.data]);

  const activeByUserId = useMemo(() => {
    const map = new Map<string, Visit>();
    for (const visit of activeVisits) {
      if (visit.user_id) map.set(visit.user_id, visit);
    }
    return map;
  }, [activeVisits]);

  const filteredActiveVisits = useMemo(
    () =>
      filterBySearch(activeVisits, activeSearchTerm, (visit) =>
        [
          visit.id,
          visit.user?.id ?? "",
          visit.user ? fullName(visit.user) : "",
          visit.user?.email ?? "",
          visit.user?.phone ?? ""
        ].join(" ")
      ),
    [activeSearchTerm, activeVisits]
  );

  const filteredClients = useMemo(
    () =>
      filterBySearch(clientsQuery.data ?? [], searchTerm, (client) =>
        [client.id, fullName(client), client.email, client.phone ?? ""].join(" ")
      ).slice(0, 8),
    [clientsQuery.data, searchTerm]
  );

  const filteredClientRows = useMemo(
    () => filteredClients.map((client) => ({ client })),
    [filteredClients]
  );

  useEffect(() => {
    if (!openMenuClientId) return;
    function handlePointerDown(event: MouseEvent) {
      if (tableRef.current && !tableRef.current.contains(event.target as Node)) {
        setOpenMenuClientId(null);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [openMenuClientId]);

  async function invalidateActive() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.visits.active(selectedBranchId) });
  }

  const checkInMutation = useMutation({
    mutationFn: (vars: { userId: string; bookingId: string | null }) =>
      checkInVisit({ user_id: vars.userId, booking_id: vars.bookingId }),
    onSuccess: async (visit) => {
      setErrorMessage(null);
      setOpenMenuClientId(null);
      queryClient.setQueryData<Visit[]>(queryKeys.visits.active(selectedBranchId), (current) =>
        current ? [...current.filter((item) => item.id !== visit.id), visit] : [visit]
      );
      await invalidateActive();
    },
    onError: (error) => setErrorMessage(error instanceof Error ? error.message : "Помилка реєстрації")
  });

  const checkOutMutation = useMutation({
    mutationFn: (visitId: string) => checkOutVisit(visitId),
    onSuccess: async (_data, visitId) => {
      setErrorMessage(null);
      setOpenMenuClientId(null);
      queryClient.setQueryData<Visit[]>(queryKeys.visits.active(selectedBranchId), (current) =>
        current ? current.filter((item) => item.id !== visitId) : current
      );
      await invalidateActive();
    },
    onError: (error) => setErrorMessage(error instanceof Error ? error.message : "Помилка реєстрації")
  });

  const mutationPending = checkInMutation.isPending || checkOutMutation.isPending;

  function toggleMenu(clientId: string) {
    setErrorMessage(null);
    setSelectedBookingId("");
    setOpenMenuClientId((current) => (current === clientId ? null : clientId));
  }

  const checkInColumns: TableColumn<CheckInClientRow>[] = [
    {
      key: "client",
      header: "Клієнт",
      render: (row) => <strong>{fullName(row.client)}</strong>
    },
    {
      key: "email",
      header: "Email",
      render: (row) => row.client.email
    },
    {
      key: "phone",
      header: "Телефон",
      render: (row) => row.client.phone ?? "—"
    },
    {
      key: "status",
      header: "Статус",
      render: (row) => (activeByUserId.get(row.client.id) ? "У залі" : "Відсутній")
    },
    {
      key: "actions",
      header: "",
      className: "check-in-menu-cell",
      render: (row) => {
        const isOpen = openMenuClientId === row.client.id;

        return (
          <button
            type="button"
            className={isOpen ? "row-menu-toggle is-open" : "row-menu-toggle"}
            aria-label="Дії"
            aria-expanded={isOpen}
            onClick={() => toggleMenu(row.client.id)}
          >
            <span aria-hidden="true">▾</span>
          </button>
        );
      }
    }
  ];

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
      key: "since",
      header: "У залі з",
      render: (visit) => formatTime(visit.checked_in_at)
    },
    {
      key: "class",
      header: "Заняття",
      render: (visit) => visit.workout_class?.title ?? "—"
    },
    {
      key: "actions",
      header: "Дія",
      render: (visit) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => checkOutMutation.mutate(visit.id)}
          disabled={mutationPending}
        >
          Вихід
        </Button>
      )
    }
  ];

  return (
    <section className="panel-stack">
      <PageHeader title="Реєстрація відвідувань" />

      {!selectedBranchId ? (
        <h2>Оберіть філію</h2>
      ) : (
        <>
          <div className="check-in-panel">
            <ManagementToolbar
              search={
                view === "check-in" ? (
                  <FormField label="Пошук клієнта">
                    <Input
                      aria-label="Пошук клієнта"
                      value={searchTerm}
                      onChange={(event) => {
                        setSearchTerm(event.target.value);
                        setOpenMenuClientId(null);
                      }}
                      placeholder="ID, ім'я, прізвище, email або телефон"
                    />
                  </FormField>
                ) : (
                  <FormField label="Пошук клієнта">
                    <Input
                      aria-label="Пошук клієнта у залі"
                      value={activeSearchTerm}
                      onChange={(event) => setActiveSearchTerm(event.target.value)}
                      placeholder="ID, ім'я, прізвище, email або телефон"
                    />
                  </FormField>
                )
              }
              tabs={
                <div className="chips">
                <button
                  type="button"
                  className={view === "check-in" ? "chip active" : "chip"}
                  onClick={() => setView("check-in")}
                >
                  Реєстрація входу
                </button>
                <button
                  type="button"
                  className={view === "active" ? "chip active" : "chip"}
                  onClick={() => setView("active")}
                >
                  У залі зараз ({activeVisits.length})
                </button>
                </div>
              }
            />

              {view === "check-in" ? (
                <div ref={tableRef}>
                  {clientsQuery.isLoading ? <p className="muted">Завантаження клієнтів...</p> : null}
                  <ManagementTableCard>
                    <Table
                      caption="Результати пошуку клієнтів"
                      columns={checkInColumns}
                      rows={filteredClientRows}
                      getRowKey={(row) => row.client.id}
                      rowClassName={(row) => (openMenuClientId === row.client.id ? "is-open" : undefined)}
                      renderExpandedRow={(row) => {
                        const visit = activeByUserId.get(row.client.id);
                        const isOpen = openMenuClientId === row.client.id;
                        const bookings = isOpen ? bookingsQuery.data ?? [] : [];

                        if (!isOpen) return null;

                        return (
                          <div className="row-menu">
                            {visit ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={mutationPending}
                                onClick={() => checkOutMutation.mutate(visit.id)}
                              >
                                Зареєструвати вихід
                              </Button>
                            ) : (
                              <>
                                <Select
                                  aria-label="Заняття"
                                  className="row-menu-select"
                                  value={selectedBookingId}
                                  onChange={(event) => setSelectedBookingId(event.target.value)}
                                >
                                  <option value="">Без заняття</option>
                                  {bookings.map((option) => (
                                    <option key={option.id} value={option.id}>
                                      {option.workout_class.title} · {formatTime(option.workout_class.start_time)}
                                    </option>
                                  ))}
                                </Select>
                                <Button
                                  size="sm"
                                  disabled={mutationPending}
                                  onClick={() =>
                                    checkInMutation.mutate({
                                      userId: row.client.id,
                                      bookingId: selectedBookingId || null
                                    })
                                  }
                                >
                                  Вхід
                                </Button>
                              </>
                            )}
                            {errorMessage ? <p className="error-banner row-menu-error">{errorMessage}</p> : null}
                          </div>
                        );
                      }}
                      emptyTitle="Клієнтів не знайдено"
                      emptyDescription="Спробуйте змінити пошуковий запит."
                    />
                  </ManagementTableCard>
                </div>
              ) : (
                <ManagementTableCard>
                  <Table
                    caption="Клієнти у залі"
                    columns={columns}
                    rows={filteredActiveVisits}
                    getRowKey={(visit) => visit.id}
                    emptyTitle={activeSearchTerm.trim() ? "Клієнтів не знайдено" : "Зараз у залі нікого немає"}
                    emptyDescription={activeSearchTerm.trim() ? "Спробуйте змінити пошуковий запит." : "Після реєстрації входу клієнти з'являться тут."}
                  />
                </ManagementTableCard>
              )}
            </div>
        </>
      )}
    </section>
  );
}
