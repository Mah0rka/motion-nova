import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import { useAuthStore } from "../../auth/model/store";
import { renderWithProviders } from "../../../test/utils";
import { UsersPage } from "./UsersPage";

const createUserMock = vi.fn();
const deleteUserMock = vi.fn();
const getUsersMock = vi.fn();
const getUsersPageMock = vi.fn();
const updateUserMock = vi.fn();
const getManagedSubscriptionsMock = vi.fn();
const getPaymentsMock = vi.fn();
const getSubscriptionPlansMock = vi.fn();
const issueClientSubscriptionMock = vi.fn();
const updateClientSubscriptionMock = vi.fn();

vi.mock("../../../shared/api", async () => {
  const actual = await vi.importActual<typeof import("../../../shared/api")>("../../../shared/api");
  return {
    ...actual,
    createUser: (...args: unknown[]) => createUserMock(...args),
    deleteUser: (...args: unknown[]) => deleteUserMock(...args),
    getUsers: (...args: unknown[]) => getUsersMock(...args),
    getUsersPage: (...args: unknown[]) => getUsersPageMock(...args),
    updateUser: (...args: unknown[]) => updateUserMock(...args),
    getManagedSubscriptions: (...args: unknown[]) => getManagedSubscriptionsMock(...args),
    getPayments: (...args: unknown[]) => getPaymentsMock(...args),
    getSubscriptionPlans: (...args: unknown[]) => getSubscriptionPlansMock(...args),
    issueClientSubscription: (...args: unknown[]) => issueClientSubscriptionMock(...args),
    updateClientSubscription: (...args: unknown[]) => updateClientSubscriptionMock(...args)
  };
});

const currentTime = "2026-03-23T00:00:00Z";

const usersFixture = [
  {
    id: "client-1",
    email: "client@example.com",
    first_name: "Client",
    last_name: "One",
    role: "CLIENT" as const,
    phone: "+380501112233",
    created_at: currentTime,
    updated_at: currentTime
  },
  {
    id: "trainer-1",
    email: "trainer@example.com",
    first_name: "Trainer",
    last_name: "One",
    role: "TRAINER" as const,
    phone: null,
    created_at: currentTime,
    updated_at: currentTime
  }
];

const plansFixture = [
  {
    id: "plan-1",
    title: "Місячний",
    description: "12 занять",
    type: "MONTHLY" as const,
    duration_days: 30,
    visits_limit: 12,
    price: 990,
    currency: "UAH",
    is_active: true,
    is_public: true,
    created_at: currentTime,
    updated_at: currentTime
  },
  {
    id: "plan-2",
    title: "Службовий",
    description: "Непублічний",
    type: "MONTHLY" as const,
    duration_days: 30,
    visits_limit: 12,
    price: 1,
    currency: "UAH",
    is_active: true,
    is_public: false,
    created_at: currentTime,
    updated_at: currentTime
  }
];

const subscriptionsFixture = [
  {
    id: "subscription-1",
    user_id: "client-1",
    plan_id: "plan-1",
    type: "MONTHLY" as const,
    start_date: "2026-03-01T00:00:00Z",
    end_date: "2026-03-31T00:00:00Z",
    status: "ACTIVE" as const,
    frozen_until: null,
    total_visits: 12,
    remaining_visits: 6,
    user: usersFixture[0],
    plan: plansFixture[0],
    created_at: currentTime,
    updated_at: currentTime
  },
  {
    id: "subscription-2",
    user_id: "client-1",
    plan_id: "plan-2",
    type: "MONTHLY" as const,
    start_date: "2026-02-01T00:00:00Z",
    end_date: "2026-02-28T00:00:00Z",
    status: "EXPIRED" as const,
    frozen_until: null,
    total_visits: 12,
    remaining_visits: 0,
    user: usersFixture[0],
    plan: plansFixture[1],
    created_at: currentTime,
    updated_at: currentTime
  }
];

const paymentsFixture = [
  {
    id: "payment-1",
    subscription_id: "subscription-1",
    user_id: "client-1",
    branch_id: "branch-1",
    amount: 990,
    currency: "UAH",
    status: "SUCCESS",
    method: "CARD",
    user: usersFixture[0],
    created_at: currentTime,
    updated_at: currentTime
  }
];

describe("UsersPage", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: "owner-1",
        email: "owner@example.com",
        first_name: "Owner",
        last_name: "Account",
        role: "OWNER",
        phone: null,
        created_at: currentTime,
        updated_at: currentTime
      },
      isAuthenticated: true,
      isReady: true
    });

    createUserMock.mockReset();
    deleteUserMock.mockReset();
    getUsersMock.mockReset();
    getUsersPageMock.mockReset();
    updateUserMock.mockReset();
    getManagedSubscriptionsMock.mockReset();
    getPaymentsMock.mockReset();
    getSubscriptionPlansMock.mockReset();
    issueClientSubscriptionMock.mockReset();
    updateClientSubscriptionMock.mockReset();

    getUsersMock.mockImplementation(async (role?: string) =>
      role ? usersFixture.filter((user) => user.role === role) : usersFixture
    );
    getUsersPageMock.mockImplementation(
      async ({ role, page = 1, pageSize = 10 }: { role?: string; page?: number; pageSize?: number } = {}) => {
        const filtered = role ? usersFixture.filter((user) => user.role === role) : usersFixture;
        const start = (page - 1) * pageSize;
        const items = filtered.slice(start, start + pageSize);
        return {
          items,
          total: filtered.length,
          page,
          page_size: pageSize,
          total_pages: Math.max(1, Math.ceil(filtered.length / pageSize))
        };
      }
    );
    getManagedSubscriptionsMock.mockResolvedValue(subscriptionsFixture);
    getPaymentsMock.mockResolvedValue(paymentsFixture);
    getSubscriptionPlansMock.mockResolvedValue(plansFixture);
  });

  it("renders users and filters by role", async () => {
    const user = userEvent.setup();
    renderWithProviders(<UsersPage />);

    expect(await screen.findByText("Учасники клубу")).toBeInTheDocument();
    expect(await screen.findByText("client@example.com")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Фільтр списку"), "TRAINER");

    await waitFor(() => {
      expect(getUsersPageMock).toHaveBeenLastCalledWith({ role: "TRAINER", page: 1, pageSize: 10 });
    });
  });

  it("creates a user", async () => {
    const user = userEvent.setup();
    createUserMock.mockResolvedValue(usersFixture[0]);

    renderWithProviders(<UsersPage />);

    await user.click(await screen.findByRole("button", { name: "Новий користувач" }));
    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.clear(screen.getByLabelText("Ім'я"));
    await user.type(screen.getByLabelText("Ім'я"), "New");
    await user.clear(screen.getByLabelText("Прізвище"));
    await user.type(screen.getByLabelText("Прізвище"), "Member");
    await user.type(screen.getByLabelText("Телефон"), "+380991234567");
    await user.selectOptions(screen.getByLabelText("Доступ"), "TRAINER");
    await user.click(screen.getByRole("button", { name: "Створити користувача" }));

    await waitFor(() => {
      expect(createUserMock).toHaveBeenCalled();
      expect(createUserMock.mock.calls[0]?.[0]).toMatchObject({
        email: "new@example.com",
        role: "TRAINER"
      });
    });
  });

  it("opens participant details with subscriptions and payments management", async () => {
    const user = userEvent.setup();
    issueClientSubscriptionMock.mockResolvedValue(subscriptionsFixture[0]);
    updateClientSubscriptionMock.mockResolvedValue(subscriptionsFixture[0]);
    deleteUserMock.mockResolvedValue(undefined);

    renderWithProviders(<UsersPage />);

    await user.click((await screen.findAllByRole("button", { name: "Редагувати" }))[0]);

    expect((await screen.findAllByText("client@example.com")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("+380501112233").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Видати абонемент" }));
    await user.selectOptions(screen.getByLabelText("Абонемент для видачі"), "plan-2");
    await user.click(screen.getByRole("button", { name: "Видати абонемент" }));

    await waitFor(() => {
      expect(issueClientSubscriptionMock).toHaveBeenCalled();
      expect(issueClientSubscriptionMock.mock.calls[0]?.[0]).toMatchObject({
        user_id: "client-1",
        plan_id: "plan-2"
      });
    });

    await user.click(await screen.findByRole("button", { name: "Історія абонементів" }));
    await user.click((await screen.findAllByRole("button", { name: "Редагувати абонемент" }))[0]);
    await user.clear(screen.getByLabelText("Залишилось відвідувань"));
    await user.type(screen.getByLabelText("Залишилось відвідувань"), "4");
    await user.click(screen.getByRole("button", { name: "Зберегти абонемент" }));

    await waitFor(() => {
      expect(updateClientSubscriptionMock).toHaveBeenCalled();
      expect(updateClientSubscriptionMock.mock.calls[0]?.[1]).toMatchObject({
        status: "ACTIVE",
        remaining_visits: 4
      });
    });

    await user.click(screen.getByRole("button", { name: "Закрити" }));
    await user.click(await screen.findByRole("button", { name: "Видалити акаунт" }));
    expect(await screen.findByText("Видалення акаунта")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Email для підтвердження"), "client@example.com");
    await user.click((await screen.findAllByRole("button", { name: "Видалити акаунт" }))[1]);

    await waitFor(() => {
      expect(deleteUserMock.mock.calls[0]?.[0]).toBe("client-1");
    });
  }, 15000);
});
