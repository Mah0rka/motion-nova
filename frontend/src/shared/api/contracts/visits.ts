import { z } from "zod";

import { branchSummarySchema } from "./branches";
import { userSchema } from "./users";

export const visitClassSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(["GROUP", "PERSONAL"]),
  start_time: z.string()
});

export const visitSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  branch_id: z.string(),
  booking_id: z.string().nullable(),
  checked_in_at: z.string(),
  checked_out_at: z.string().nullable(),
  checked_in_by_id: z.string(),
  created_at: z.string(),
  user: userSchema,
  branch: branchSummarySchema.nullable().optional(),
  checked_in_by: userSchema.nullable().optional(),
  workout_class: visitClassSummarySchema.nullable().optional()
});

export const checkInBookingOptionSchema = z.object({
  id: z.string(),
  workout_class: visitClassSummarySchema
});

export type Visit = z.infer<typeof visitSchema>;
export type VisitClassSummary = z.infer<typeof visitClassSummarySchema>;
export type CheckInBookingOption = z.infer<typeof checkInBookingOptionSchema>;
