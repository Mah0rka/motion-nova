import { z } from "zod";

import type { Expense, ExpenseCategory } from "../core/contracts";
import { expenseSchema } from "../core/contracts";
import { request } from "../core/http";

export async function getExpenses(input?: { from?: string; to?: string }): Promise<Expense[]> {
  const params = new URLSearchParams();
  if (input?.from) params.set("from", input.from);
  if (input?.to) params.set("to", input.to);
  const data = await request<unknown>(`/expenses${params.size ? `?${params.toString()}` : ""}`, {
    method: "GET"
  });
  return z.array(expenseSchema).parse(data);
}

export async function createExpense(input: {
  category: ExpenseCategory;
  amount: number;
  paid_at: string;
  description?: string | null;
}): Promise<Expense> {
  const data = await request<unknown>("/expenses", {
    method: "POST",
    body: JSON.stringify(input)
  });
  return expenseSchema.parse(data);
}

export async function updateExpense(
  expenseId: string,
  input: {
    category?: ExpenseCategory;
    amount?: number;
    paid_at?: string;
    description?: string | null;
  }
): Promise<Expense> {
  const data = await request<unknown>(`/expenses/${expenseId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
  return expenseSchema.parse(data);
}

export async function deleteExpense(expenseId: string): Promise<void> {
  await request<void>(`/expenses/${expenseId}`, { method: "DELETE" });
}
