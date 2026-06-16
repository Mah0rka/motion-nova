import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import { renderWithProviders } from "../../../test/utils";
import { useBranchStore } from "../../branches/model/store";
import { ExpensesPage } from "./ExpensesPage";

const getExpensesMock = vi.fn();
const createExpenseMock = vi.fn();
const deleteExpenseMock = vi.fn();

vi.mock("../../../shared/api", async () => {
  const actual = await vi.importActual<typeof import("../../../shared/api")>("../../../shared/api");
  return {
    ...actual,
    getExpenses: (...args: unknown[]) => getExpensesMock(...args),
    createExpense: (...args: unknown[]) => createExpenseMock(...args),
    deleteExpense: (...args: unknown[]) => deleteExpenseMock(...args)
  };
});

const expenseFixture = {
  id: "expense-1",
  branch_id: "branch-1",
  category: "RENT" as const,
  amount: 18000,
  paid_at: "2026-06-01T00:00:00Z",
  description: "Оренда",
  created_by_id: "owner-1",
  created_at: "2026-06-01T00:00:00Z",
  branch: {
    id: "branch-1",
    name: "Центр",
    address: "вул. Соборності, 1",
    timezone: "Europe/Kyiv",
    is_active: true
  },
  created_by: null
};

describe("ExpensesPage", () => {
  beforeEach(() => {
    useBranchStore.setState({ selectedBranchId: "branch-1" });
    getExpensesMock.mockReset().mockResolvedValue([]);
    createExpenseMock.mockReset().mockResolvedValue(expenseFixture);
    deleteExpenseMock.mockReset().mockResolvedValue(undefined);
  });

  it("creates an expense from the form", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExpensesPage />);

    await user.click(await screen.findByRole("button", { name: "Нова витрата" }));
    await user.type(screen.getByLabelText("Сума"), "18000");
    await user.click(screen.getByRole("button", { name: "Додати витрату" }));

    await waitFor(() => {
      expect(createExpenseMock).toHaveBeenCalled();
      expect(createExpenseMock.mock.calls[0]?.[0]).toMatchObject({ category: "RENT", amount: 18000 });
    });
  });

  it("lists and deletes an expense", async () => {
    const user = userEvent.setup();
    getExpensesMock.mockResolvedValue([expenseFixture]);

    renderWithProviders(<ExpensesPage />);

    await user.click(await screen.findByRole("button", { name: "Видалити" }));

    await waitFor(() => {
      expect(deleteExpenseMock).toHaveBeenCalledWith("expense-1");
    });
  });
});
