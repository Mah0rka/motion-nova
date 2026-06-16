import { z } from "zod";

import { branchSummarySchema } from "./branches";
import { userSchema } from "./users";

export const expenseCategories = [
  "RENT",
  "UTILITIES",
  "SALARIES",
  "MARKETING",
  "EQUIPMENT",
  "OTHER"
] as const;

export const expenseSchema = z.object({
  id: z.string(),
  branch_id: z.string(),
  category: z.enum(expenseCategories),
  amount: z.coerce.number(),
  paid_at: z.string(),
  description: z.string().nullable(),
  created_by_id: z.string(),
  created_at: z.string(),
  branch: branchSummarySchema.nullable().optional(),
  created_by: userSchema.nullable().optional()
});

export type Expense = z.infer<typeof expenseSchema>;
export type ExpenseCategory = (typeof expenseCategories)[number];
