import { z } from "zod";

import type { CheckInBookingOption, Visit } from "../core/contracts";
import { checkInBookingOptionSchema, visitSchema } from "../core/contracts";
import { request } from "../core/http";

export async function checkInVisit(input: {
  user_id: string;
  booking_id?: string | null;
}): Promise<Visit> {
  const data = await request<unknown>("/visits/check-in", {
    method: "POST",
    body: JSON.stringify({ user_id: input.user_id, booking_id: input.booking_id ?? null })
  });
  return visitSchema.parse(data);
}

export async function checkOutVisit(visitId: string): Promise<Visit> {
  const data = await request<unknown>(`/visits/${visitId}/check-out`, { method: "POST" });
  return visitSchema.parse(data);
}

export async function getActiveVisits(): Promise<Visit[]> {
  const data = await request<unknown>("/visits/active", { method: "GET" });
  return z.array(visitSchema).parse(data);
}

export async function getVisitHistory(input?: {
  from?: string;
  to?: string;
}): Promise<Visit[]> {
  const params = new URLSearchParams();
  if (input?.from) params.set("from", input.from);
  if (input?.to) params.set("to", input.to);
  const data = await request<unknown>(`/visits/history${params.size ? `?${params.toString()}` : ""}`, {
    method: "GET"
  });
  return z.array(visitSchema).parse(data);
}

export async function getCheckInBookings(userId: string): Promise<CheckInBookingOption[]> {
  const params = new URLSearchParams({ userId });
  const data = await request<unknown>(`/visits/bookings?${params.toString()}`, { method: "GET" });
  return z.array(checkInBookingOptionSchema).parse(data);
}
