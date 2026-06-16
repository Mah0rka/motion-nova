import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { cancelBooking, getMyBookings, queryKeys } from "../../../shared/api";
import { hasSessionEnded } from "../../../shared/lib/sessionTime";
import { formatDateTime, fullName } from "../../../shared/lib/format";
import { Button, PageHeader } from "../../../shared/ui";

export function BookingsPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"ACTIVE" | "HISTORY">("ACTIVE");
  const bookingsQuery = useQuery({ queryKey: queryKeys.bookings.mine(), queryFn: getMyBookings });
  const cancelMutation = useMutation({
    mutationFn: cancelBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.mine() });
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.mine() });
    }
  });
  const visibleBookings = useMemo(() => {
    const bookings = bookingsQuery.data ?? [];
    return view === "ACTIVE"
      ? bookings.filter((booking) => booking.status === "CONFIRMED" && !hasSessionEnded(booking.workout_class.end_time))
      : bookings.filter((booking) => booking.status !== "CONFIRMED" || hasSessionEnded(booking.workout_class.end_time));
  }, [bookingsQuery.data, view]);

  return (
    <section className="panel-stack">
      <PageHeader title="Мої записи" />
      <section className="card schedule-card">
        <div className="chips">
          <button className={view === "ACTIVE" ? "chip active" : "chip"} onClick={() => setView("ACTIVE")}>Актуальні</button>
          <button className={view === "HISTORY" ? "chip active" : "chip"} onClick={() => setView("HISTORY")}>Історія</button>
        </div>
        {bookingsQuery.isLoading ? <p className="muted">Завантаження...</p> : null}
        {bookingsQuery.isError || cancelMutation.isError ? <p className="error-banner">Не вдалося виконати запит.</p> : null}
        <div className="schedule-grid">
          {visibleBookings.length ? visibleBookings.map((booking) => (
            <article className="schedule-item" key={booking.id}>
              <h2>{booking.workout_class.title}</h2>
              <p className="muted">Філія: {booking.workout_class.branch.name}</p>
              <p className="muted">{formatDateTime(booking.workout_class.start_time)}</p>
              <p className="muted">Тренер: {fullName(booking.workout_class.trainer)}</p>
              {booking.status === "CONFIRMED" ? <Button variant="ghost" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate(booking.id)}>Скасувати запис</Button> : null}
            </article>
          )) : <article className="schedule-item empty-card"><h2>{view === "ACTIVE" ? "Поки без активних записів" : "Історія порожня"}</h2></article>}
        </div>
      </section>
    </section>
  );
}
