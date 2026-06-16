import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createExpense,
  deleteExpense,
  expenseCategories,
  getExpenses,
  queryKeys,
  type Expense,
  type ExpenseCategory
} from "../../../shared/api";
import {
  Badge,
  Button,
  DateRangeFilter,
  FormField,
  Input,
  ManagementTableCard,
  ManagementToolbar,
  Modal,
  PageHeader,
  Pagination,
  Select,
  Table,
  type TableColumn,
  useSearchPagination
} from "../../../shared/ui";
import { daysAgoInput, isoEnd, isoStart, todayInput } from "../../../shared/lib/dateRange";
import { formatDate, formatMoney } from "../../../shared/lib/format";
import { useBranchStore } from "../../branches/model/store";

const categoryLabels: Record<ExpenseCategory, string> = {
  RENT: "Оренда",
  UTILITIES: "Комунальні",
  SALARIES: "Зарплати",
  MARKETING: "Маркетинг",
  EQUIPMENT: "Обладнання",
  OTHER: "Інше"
};

export function ExpensesPage() {
  const queryClient = useQueryClient();
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState(daysAgoInput(90));
  const [toDate, setToDate] = useState(todayInput());
  const [category, setCategory] = useState<ExpenseCategory>("RENT");
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(todayInput());
  const [description, setDescription] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const from = fromDate ? isoStart(fromDate) : undefined;
  const to = toDate ? isoEnd(toDate) : undefined;

  const expensesQuery = useQuery({
    queryKey: queryKeys.expenses.list(selectedBranchId, from, to),
    queryFn: () => getExpenses({ from, to })
  });

  const expenses = useMemo(() => expensesQuery.data ?? [], [expensesQuery.data]);

  const { filtered: filteredExpenses, page, setPage, totalPages, pageItems } = useSearchPagination(
    expenses,
    searchTerm,
    (expense) =>
      `${categoryLabels[expense.category]} ${expense.branch?.name ?? ""} ${expense.description ?? ""}`
  );
  const total = useMemo(
    () => filteredExpenses.reduce((sum, item) => sum + item.amount, 0),
    [filteredExpenses]
  );

  function invalidateList() {
    return queryClient.invalidateQueries({ queryKey: queryKeys.expenses.root() });
  }

  const createMutation = useMutation({
    mutationFn: () =>
      createExpense({
        category,
        amount: Number(amount),
        paid_at: isoStart(paidAt),
        description: description.trim() || null
      }),
    onSuccess: async () => {
      setErrorMessage(null);
      setAmount("");
      setDescription("");
      setIsCreateOpen(false);
      await invalidateList();
    },
    onError: (error) => setErrorMessage(error instanceof Error ? error.message : "Помилка створення")
  });

  const deleteMutation = useMutation({
    mutationFn: (expenseId: string) => deleteExpense(expenseId),
    onSuccess: async () => {
      await invalidateList();
    }
  });

  function openCreate() {
    setErrorMessage(null);
    setIsCreateOpen(true);
  }

  function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    if (!selectedBranchId) {
      setErrorMessage("Оберіть філію зверху, щоб додати витрату");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setErrorMessage("Введіть суму більшу за нуль");
      return;
    }
    createMutation.mutate();
  }

  const columns: TableColumn<Expense>[] = [
    {
      key: "category",
      header: "Категорія",
      render: (expense) => categoryLabels[expense.category]
    },
    {
      key: "amount",
      header: "Сума",
      render: (expense) => <strong>{formatMoney(expense.amount, "UAH")}</strong>
    },
    {
      key: "branch",
      header: "Філія",
      render: (expense) => expense.branch?.name ?? "—"
    },
    {
      key: "paidAt",
      header: "Дата",
      render: (expense) => formatDate(expense.paid_at)
    },
    {
      key: "description",
      header: "Опис",
      render: (expense) => expense.description ?? "—"
    },
    {
      key: "actions",
      header: "Дія",
      render: (expense) => (
        <Button
          variant="danger"
          size="sm"
          onClick={() => deleteMutation.mutate(expense.id)}
          disabled={deleteMutation.isPending}
        >
          Видалити
        </Button>
      )
    }
  ];

  return (
    <section className="panel-stack">
      <PageHeader title="Витрати філій" />

      <ManagementToolbar
        search={
          <FormField label="Пошук">
            <Input
              aria-label="Пошук"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Категорія, філія або опис"
            />
          </FormField>
        }
        filters={
          <DateRangeFilter
            from={fromDate}
            to={toDate}
            onFromChange={setFromDate}
            onToChange={setToDate}
          />
        }
        summary={
          <>
            <Badge>{filteredExpenses.length} витрат</Badge>
            <Badge>{formatMoney(total, "UAH")}</Badge>
          </>
        }
        actions={<Button onClick={openCreate}>Нова витрата</Button>}
      />

      <ManagementTableCard>
        <Table
          caption="Витрати філій"
          columns={columns}
          rows={pageItems}
          getRowKey={(expense) => expense.id}
          emptyTitle="Витрат не знайдено"
          emptyDescription="Змініть пошук або період, або додайте витрату через кнопку «Нова витрата»."
        />
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </ManagementTableCard>

      <Modal
        open={isCreateOpen}
        title="Нова витрата"
        size="lg"
        onClose={() => setIsCreateOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Скасувати</Button>
            <Button
              variant="secondary"
              disabled={createMutation.isPending}
              onClick={() => handleSubmit()}
            >
              {createMutation.isPending ? "Додавання..." : "Додати витрату"}
            </Button>
          </>
        }
      >
        <div className="subscription-editor-grid">
          <FormField label="Категорія">
            <Select
              aria-label="Категорія"
              value={category}
              onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
            >
              {expenseCategories.map((value) => (
                <option key={value} value={value}>
                  {categoryLabels[value]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Сума, UAH">
            <Input
              type="number"
              min="0"
              step="0.01"
              aria-label="Сума"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
            />
          </FormField>
          <FormField label="Дата">
            <Input
              type="date"
              aria-label="Дата витрати"
              value={paidAt}
              onChange={(event) => setPaidAt(event.target.value)}
            />
          </FormField>
          <FormField label="Опис (необов'язково)">
            <Input
              aria-label="Опис"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Коментар"
            />
          </FormField>
        </div>
        {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}
      </Modal>
    </section>
  );
}
