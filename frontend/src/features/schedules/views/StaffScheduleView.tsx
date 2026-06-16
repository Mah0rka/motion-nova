import { useEffect, useMemo, useRef, useState } from "react";
import type { DateSelectArg, DatesSetArg, EventClickArg } from "@fullcalendar/core";
import ukLocale from "@fullcalendar/core/locales/uk";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createSchedule, getScheduleAttendees, getSchedules, getUsers, queryKeys, removeSchedule, updateSchedule, type Schedule } from "../../../shared/api";
import { Button, ManagementTableCard, ManagementToolbar, PageHeader, Select } from "../../../shared/ui";
import { fullName } from "../../../shared/lib/format";
import { useAuthStore } from "../../auth";
import { useBranchStore } from "../../branches/model/store";
import { createDefaultForm, createFormFromSchedule, getFormValidationError, getInitialCalendarRange, renderCalendarEventContent, toCalendarRange, toIsoString, type ClassTypeFilter, type EditorState, type ScheduleFormState } from "../lib/scheduleShared";
import { ScheduleEditorModal } from "../ui/ScheduleEditorModal";

type CalendarView = "timeGridDay" | "timeGridWeek";
const NARROW_CALENDAR_QUERY = "(max-width: 720px)";

function getInitialCalendarView(): CalendarView {
  if (typeof window === "undefined") return "timeGridWeek";
  return window.matchMedia(NARROW_CALENDAR_QUERY).matches ? "timeGridDay" : "timeGridWeek";
}

export function StaffScheduleView() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  const isManagement = user?.role === "OWNER" || user?.role === "ADMIN";
  const isTrainer = user?.role === "TRAINER";
  const calendarRef = useRef<FullCalendar | null>(null);
  const [range, setRange] = useState(getInitialCalendarRange);
  const [filter, setFilter] = useState<ClassTypeFilter>("ALL");
  const [selectedTrainerId, setSelectedTrainerId] = useState("ALL");
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [calendarView, setCalendarView] = useState<CalendarView>(getInitialCalendarView);

  useEffect(() => {
    const media = window.matchMedia(NARROW_CALENDAR_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setCalendarView(event.matches ? "timeGridDay" : "timeGridWeek");
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    calendarRef.current?.getApi().changeView(calendarView);
  }, [calendarView]);

  const schedulesQuery = useQuery({ queryKey: queryKeys.schedules.calendar(range.from, range.to, selectedBranchId), queryFn: () => getSchedules(range) });
  const trainersQuery = useQuery({ queryKey: queryKeys.schedules.trainers(), queryFn: () => getUsers("TRAINER"), enabled: isManagement });
  const attendeesQuery = useQuery({
    queryKey: queryKeys.schedules.attendees(editorState?.schedule?.id),
    queryFn: () => getScheduleAttendees(editorState!.schedule!.id),
    enabled: Boolean(editorState?.schedule && (isManagement || editorState.schedule.trainer_id === user?.id))
  });

  function invalidateSchedules() {
    queryClient.invalidateQueries({ queryKey: queryKeys.schedules.all(selectedBranchId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.classes.mine(selectedBranchId) });
  }
  const createMutation = useMutation({ mutationFn: createSchedule, onSuccess: () => { invalidateSchedules(); setEditorState(null); } });
  const updateMutation = useMutation({ mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateSchedule>[1] }) => updateSchedule(id, input), onSuccess: () => { invalidateSchedules(); setEditorState(null); } });
  const deleteMutation = useMutation({ mutationFn: removeSchedule, onSuccess: () => { invalidateSchedules(); setEditorState(null); } });

  const visibleSchedules = useMemo(() => (schedulesQuery.data ?? []).filter((schedule) => {
    if (filter !== "ALL" && schedule.type !== filter) return false;
    if (selectedTrainerId !== "ALL" && schedule.trainer_id !== selectedTrainerId) return false;
    if (isTrainer && schedule.trainer_id !== user?.id) return false;
    return true;
  }), [filter, isTrainer, schedulesQuery.data, selectedTrainerId, user?.id]);

  const calendarEvents = useMemo(() => visibleSchedules.map((schedule) => ({
    id: schedule.id,
    title: schedule.title,
    start: schedule.start_time,
    end: schedule.end_time,
    classNames: ["staff-calendar-slot", schedule.type === "PERSONAL" ? "staff-calendar-slot-personal" : "staff-calendar-slot-group"],
    extendedProps: { schedule }
  })), [visibleSchedules]);

  const activeSchedule = editorState?.schedule;
  const canEdit = Boolean(editorState && isManagement);
  const canDelete = Boolean(activeSchedule && isManagement);
  const validationError = editorState ? getFormValidationError(editorState.form, isManagement) : null;

  function openCreate(start?: Date, end?: Date) {
    if (!isManagement) return;
    setEditorState({ mode: "create", schedule: null, form: createDefaultForm(start, end, selectedTrainerId === "ALL" ? "" : selectedTrainerId) });
  }
  function openEdit(schedule: Schedule) { setEditorState({ mode: "edit", schedule, form: createFormFromSchedule(schedule) }); }
  function updateForm(update: Partial<ScheduleFormState>) { setEditorState((current) => current ? { ...current, form: { ...current.form, ...update } } : current); }
  async function save() {
    if (!editorState) return;
    const payload = { title: editorState.form.title.trim(), type: editorState.form.type, startTime: toIsoString(editorState.form.startTime), endTime: toIsoString(editorState.form.endTime), capacity: Number(editorState.form.capacity), trainerId: editorState.form.trainerId || undefined };
    if (editorState.mode === "create") await createMutation.mutateAsync(payload);
    else await updateMutation.mutateAsync({ id: editorState.schedule!.id, input: payload });
  }
  return (
    <section className="panel-stack">
      <PageHeader title="Календар занять" />
      <ManagementToolbar
        className="schedule-toolbar"
        filters={
          <>
            <Select value={filter} onChange={(event) => setFilter(event.target.value as ClassTypeFilter)} aria-label="Тип заняття">
              <option value="ALL">Усі типи</option>
              <option value="GROUP">GROUP</option>
              <option value="PERSONAL">PERSONAL</option>
            </Select>
            {isManagement ? (
              <Select value={selectedTrainerId} onChange={(event) => setSelectedTrainerId(event.target.value)} aria-label="Тренер">
                <option value="ALL">Усі тренери</option>
                {trainersQuery.data?.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>
                    {fullName(trainer)}
                  </option>
                ))}
              </Select>
            ) : null}
          </>
        }
        actions={
          <>
            <div className="schedule-calendar-view-toggle" role="group" aria-label="Вид календаря">
              <Button variant={calendarView === "timeGridDay" ? "primary" : "secondary"} aria-pressed={calendarView === "timeGridDay"} onClick={() => setCalendarView("timeGridDay")}>День</Button>
              <Button variant={calendarView === "timeGridWeek" ? "primary" : "secondary"} aria-pressed={calendarView === "timeGridWeek"} onClick={() => setCalendarView("timeGridWeek")}>Тиждень</Button>
            </div>
            <div className="schedule-calendar-nav">
              <Button variant="secondary" onClick={() => calendarRef.current?.getApi().prev()}>Назад</Button>
              <Button variant="secondary" onClick={() => calendarRef.current?.getApi().today()}>Сьогодні</Button>
              <Button variant="secondary" onClick={() => calendarRef.current?.getApi().next()}>Далі</Button>
            </div>
            {isManagement ? <Button onClick={() => openCreate()}>Додати заняття</Button> : null}
          </>
        }
      />
      <ManagementTableCard className="schedule-card schedule-calendar-card">
        {schedulesQuery.isError ? <p className="error-banner">Не вдалося завантажити розклад.</p> : null}
        <FullCalendar ref={calendarRef} plugins={[interactionPlugin, timeGridPlugin]} locale={ukLocale} initialView={calendarView} headerToolbar={false} selectable={isManagement} select={(info: DateSelectArg) => openCreate(info.start, info.end)} eventClick={(info: EventClickArg) => openEdit((info.event.extendedProps as { schedule: Schedule }).schedule)} datesSet={(info: DatesSetArg) => { setRange(toCalendarRange(info)); }} events={calendarEvents} eventContent={renderCalendarEventContent} slotMinTime="06:00:00" slotMaxTime="22:00:00" allDaySlot={false} height="auto" />
      </ManagementTableCard>
      {editorState ? <ScheduleEditorModal editorState={editorState} trainers={trainersQuery.data ?? []} attendees={attendeesQuery.data ?? []} isAttendeesLoading={attendeesQuery.isLoading} canEdit={canEdit} canDelete={canDelete} canViewAttendees={Boolean(activeSchedule && (isManagement || activeSchedule.trainer_id === user?.id))} validationError={validationError} createPending={createMutation.isPending} updatePending={updateMutation.isPending} deletePending={deleteMutation.isPending} onFormChange={updateForm} onSave={() => void save()} onDelete={() => activeSchedule && deleteMutation.mutate(activeSchedule.id)} onClose={() => setEditorState(null)} /> : null}
    </section>
  );
}
