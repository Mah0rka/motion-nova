import { z } from "zod";

import { userSchema } from "./users";

export const branchSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  timezone: z.string(),
  is_active: z.boolean()
});

export const branchSchema = branchSummarySchema.extend({
  created_at: z.string(),
  updated_at: z.string()
});

export const staffBranchAssignmentSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  branch_id: z.string(),
  user: userSchema.nullable().optional(),
  created_at: z.string(),
  updated_at: z.string()
});

export type BranchSummary = z.infer<typeof branchSummarySchema>;
export type Branch = z.infer<typeof branchSchema>;
export type StaffBranchAssignment = z.infer<typeof staffBranchAssignmentSchema>;
