import { z } from "zod";

import { branchSummarySchema } from "./branches";
import { userSchema } from "./users";

export const paymentSchema = z.object({
  id: z.string(),
  subscription_id: z.string(),
  user_id: z.string(),
  branch_id: z.string(),
  branch: branchSummarySchema.nullable().optional(),
  amount: z.coerce.number(),
  currency: z.string(),
  status: z.string(),
  method: z.string(),
  user: userSchema.optional().nullable(),
  created_at: z.string(),
  updated_at: z.string()
});

export type Payment = z.infer<typeof paymentSchema>;
