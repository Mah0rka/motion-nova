import { z } from "zod";

import { branchSummarySchema } from "./branches";

const compactUserSchema = z.object({
  id: z.string(),
  first_name: z.string(),
  last_name: z.string()
});

export const scheduleSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  trainer_id: z.string(),
  branch_id: z.string(),
  branch: branchSummarySchema,
  start_time: z.string(),
  end_time: z.string(),
  capacity: z.number(),
  type: z.enum(["GROUP", "PERSONAL"]),
  trainer: compactUserSchema,
  completed_at: z.string().nullable().optional(),
  completion_comment: z.string().nullable().optional(),
  completed_by: compactUserSchema.nullable().optional(),
  bookings: z.array(z.object({
    id: z.string(),
    user_id: z.string(),
    status: z.enum(["CONFIRMED", "CANCELLED"])
  })).default([]),
  created_at: z.string(),
  updated_at: z.string()
});

export const scheduleAttendeeSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  status: z.enum(["CONFIRMED", "CANCELLED"]),
  created_at: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    first_name: z.string(),
    last_name: z.string()
  })
});

export type Schedule = z.infer<typeof scheduleSchema>;
export type ScheduleAttendee = z.infer<typeof scheduleAttendeeSchema>;
