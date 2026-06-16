import { z } from "zod";

import type { Schedule, ScheduleAttendee } from "../core/contracts";
import { scheduleAttendeeSchema, scheduleSchema } from "../core/contracts";
import { request } from "../core/http";

function buildRangeQuery(input?: { from?: string; to?: string }): string {
  if (!input?.from && !input?.to) return "";
  const params = new URLSearchParams();
  if (input.from) params.set("from", input.from);
  if (input.to) params.set("to", input.to);
  return `?${params.toString()}`;
}

export async function getSchedules(input?: { from?: string; to?: string }): Promise<Schedule[]> {
  const data = await request<unknown>(`/schedules${buildRangeQuery(input)}`, { method: "GET" });
  return z.array(scheduleSchema).parse(data);
}

export async function getMyClasses(input?: { from?: string; to?: string }): Promise<Schedule[]> {
  const data = await request<unknown>(`/schedules/my-classes${buildRangeQuery(input)}`, { method: "GET" });
  return z.array(scheduleSchema).parse(data);
}

export async function getScheduleAttendees(classId: string): Promise<ScheduleAttendee[]> {
  const data = await request<unknown>(`/schedules/${classId}/attendees`, { method: "GET" });
  return z.array(scheduleAttendeeSchema).parse(data);
}

export async function completeSchedule(classId: string, input: { comment?: string | null }): Promise<Schedule> {
  const data = await request<unknown>(`/schedules/${classId}/complete`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
  return scheduleSchema.parse(data);
}

type ScheduleInput = {
  title: string;
  type: "GROUP" | "PERSONAL";
  startTime: string;
  endTime: string;
  capacity: number;
  trainerId?: string;
};

export async function createSchedule(input: ScheduleInput): Promise<Schedule> {
  const data = await request<unknown>("/schedules", {
    method: "POST",
    body: JSON.stringify(input)
  });
  return scheduleSchema.parse(data);
}

export async function updateSchedule(id: string, input: Partial<ScheduleInput>): Promise<Schedule> {
  const data = await request<unknown>(`/schedules/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
  return scheduleSchema.parse(data);
}

export async function removeSchedule(id: string): Promise<void> {
  await request(`/schedules/${id}`, { method: "DELETE" });
}
