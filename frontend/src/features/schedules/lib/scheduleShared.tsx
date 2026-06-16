import type { DatesSetArg, EventContentArg } from "@fullcalendar/core";

import type { Schedule } from "../../../shared/api";

export const classTypes = ["ALL", "GROUP", "PERSONAL"] as const;
export type ClassTypeFilter = (typeof classTypes)[number];
export type EditorMode = "create" | "edit";

export type ScheduleFormState = {
  title: string;
  type: "GROUP" | "PERSONAL";
  startTime: string;
  endTime: string;
  capacity: number;
  trainerId: string;
};

export type EditorState = {
  mode: EditorMode;
  schedule: Schedule | null;
  form: ScheduleFormState;
};

const CLUB_OPEN_HOUR = 6;
const CLUB_CLOSE_HOUR = 22;

export function toCalendarRange(info: DatesSetArg) {
  return {
    from: info.start.toISOString(),
    to: new Date(info.end.getTime() - 1000).toISOString()
  };
}

export function getInitialCalendarRange() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 1);
  const end = new Date(now);
  end.setDate(end.getDate() + 8);
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

export function getRoundedSlot(hoursFromNow = 1) {
  const value = new Date();
  value.setMinutes(0, 0, 0);
  value.setHours(value.getHours() + hoursFromNow);
  return value;
}

export function toLocalInputValue(isoString: string): string {
  const date = new Date(isoString);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function toIsoString(localValue: string): string {
  return new Date(localValue).toISOString();
}

export function formatCalendarDate(isoString: string): string {
  return new Date(isoString).toLocaleString("uk-UA", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function formatEventTimeRange(schedule: Schedule): string {
  const format = (value: string) => new Date(value).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });
  return `${format(schedule.start_time)}–${format(schedule.end_time)}`;
}

function isWithinClubHours(form: ScheduleFormState): boolean {
  const start = new Date(form.startTime);
  const end = new Date(form.endTime);
  return start.getHours() >= CLUB_OPEN_HOUR && (end.getHours() < CLUB_CLOSE_HOUR || (end.getHours() === CLUB_CLOSE_HOUR && end.getMinutes() === 0));
}

export function getFormValidationError(form: ScheduleFormState, requireTrainer: boolean): string | null {
  if (!form.title.trim() || !form.startTime || !form.endTime) return "Заповніть назву та часовий інтервал заняття.";
  if (new Date(form.endTime) <= new Date(form.startTime)) return "Час завершення має бути пізніше за час початку.";
  if (!isWithinClubHours(form)) return "Клуб працює з 06:00 до 22:00.";
  if (requireTrainer && !form.trainerId) return "Оберіть тренера для заняття.";
  return null;
}

export function createDefaultForm(start?: Date, end?: Date, trainerId = ""): ScheduleFormState {
  const defaultStart = start ?? getRoundedSlot(1);
  const defaultEnd = end ?? new Date(defaultStart.getTime() + 60 * 60 * 1000);
  return {
    title: "",
    type: "GROUP",
    startTime: toLocalInputValue(defaultStart.toISOString()),
    endTime: toLocalInputValue(defaultEnd.toISOString()),
    capacity: 10,
    trainerId
  };
}

export function createFormFromSchedule(schedule: Schedule): ScheduleFormState {
  return {
    title: schedule.title,
    type: schedule.type,
    startTime: toLocalInputValue(schedule.start_time),
    endTime: toLocalInputValue(schedule.end_time),
    capacity: schedule.capacity,
    trainerId: schedule.trainer_id
  };
}

export function getScheduleStats(schedule: Schedule) {
  return { confirmedBookings: schedule.bookings.filter((booking) => booking.status === "CONFIRMED").length };
}

export function renderCalendarEventContent(arg: EventContentArg) {
  const schedule = (arg.event.extendedProps as { schedule: Schedule }).schedule;
  const { confirmedBookings } = getScheduleStats(schedule);
  return (
    <div className="staff-calendar-event">
      <span className="staff-calendar-event-title">{schedule.title}</span>
      <span className="staff-calendar-event-meta">{formatEventTimeRange(schedule)} · {confirmedBookings}/{schedule.capacity}</span>
    </div>
  );
}
