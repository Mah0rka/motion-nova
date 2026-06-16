import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createBooking, getSchedules, queryKeys } from "../../../shared/api";
import { hasSessionStarted } from "../../../shared/lib/sessionTime";
import { formatDateTime, fullName } from "../../../shared/lib/format";
import { Button, PageHeader } from "../../../shared/ui";
import { useAuthStore } from "../../auth";
import { useBranchStore } from "../../branches/model/store";
import { classTypes, getScheduleStats, type ClassTypeFilter } from "../lib/scheduleShared";

export function ClientScheduleView() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  const [filter, setFilter] = useState<ClassTypeFilter>("ALL");

  const schedulesQuery = useQuery({
    queryKey: queryKeys.schedules.clientList(selectedBranchId),
    queryFn: () => getSchedules()
  });

  const bookMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.all(selectedBranchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.mine() });
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.mine() });
    }
  });

  const filteredSchedules = useMemo(
    () => (schedulesQuery.data ?? []).filter((schedule) => !hasSessionStarted(schedule.start_time) && (filter === "ALL" || schedule.type === filter)),
    [filter, schedulesQuery.data]
  );

  return (
    <section className="panel-stack">
      <PageHeader title="Розклад занять" />
      <section className="card schedule-card">
        <div className="chips">
          {classTypes.map((classType) => (
            <button key={classType} className={filter === classType ? "chip active" : "chip"} onClick={() => setFilter(classType)}>
              {classType === "ALL" ? "Усі" : classType}
            </button>
          ))}
        </div>
        {schedulesQuery.isLoading ? <p className="muted">Завантаження розкладу...</p> : null}
        {schedulesQuery.isError || bookMutation.isError ? <p className="error-banner">Не вдалося виконати запит.</p> : null}
        <div className="schedule-grid">
          {filteredSchedules.length ? filteredSchedules.map((schedule) => {
            const { confirmedBookings } = getScheduleStats(schedule);
            const isAlreadyBooked = schedule.bookings.some((booking) => booking.user_id === user?.id && booking.status === "CONFIRMED");
            return (
              <article className="schedule-item" key={schedule.id}>
                <h2>{schedule.title}</h2>
                <p className="muted">Філія: {schedule.branch?.name ?? "—"}</p>
                <p className="muted">{formatDateTime(schedule.start_time)} — {formatDateTime(schedule.end_time)}</p>
                <dl className="details compact-details">
                  <div><dt>Тренер</dt><dd>{fullName(schedule.trainer)}</dd></div>
                  <div><dt>Записи</dt><dd>{confirmedBookings}/{schedule.capacity}</dd></div>
                </dl>
                <Button variant="secondary" disabled={isAlreadyBooked || bookMutation.isPending} onClick={() => bookMutation.mutate(schedule.id)}>
                  {isAlreadyBooked ? "Ви записані" : bookMutation.isPending ? "Бронювання..." : "Записатись"}
                </Button>
              </article>
            );
          }) : <article className="schedule-item empty-card"><h2>Занять поки немає</h2><p className="muted">Оберіть іншу філію або перевірте пізніше.</p></article>}
        </div>
      </section>
    </section>
  );
}
