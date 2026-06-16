import userEvent from "@testing-library/user-event";
import { screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";

import { useAuthStore } from "../../auth";
import { renderWithProviders } from "../../../test/utils";
import { SubscriptionsPage } from "./SubscriptionsPage";

const getSubscriptionPlansMock = vi.fn();
const getSubscriptionsMock = vi.fn();
const purchaseSubscriptionMock = vi.fn();
const freezeSubscriptionMock = vi.fn();
const unfreezeSubscriptionMock = vi.fn();
const createMembershipPlanMock = vi.fn();
const updateMembershipPlanMock = vi.fn();
const deleteMembershipPlanMock = vi.fn();

vi.mock("../../../shared/api", async () => {
  const actual = await vi.importActual<typeof import("../../../shared/api")>("../../../shared/api");
  return {
    ...actual,
    getSubscriptionPlans: () => getSubscriptionPlansMock(),
    getSubscriptions: () => getSubscriptionsMock(),
    purchaseSubscription: (...args: unknown[]) => purchaseSubscriptionMock(...args),
    freezeSubscription: (...args: unknown[]) => freezeSubscriptionMock(...args),
    unfreezeSubscription: (...args: unknown[]) => unfreezeSubscriptionMock(...args),
    createMembershipPlan: (...args: unknown[]) => createMembershipPlanMock(...args),
    updateMembershipPlan: (...args: unknown[]) => updateMembershipPlanMock(...args),
    deleteMembershipPlan: (...args: unknown[]) => deleteMembershipPlanMock(...args)
  };
});

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
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z"
  },
  {
    id: "plan-2",
    title: "Річний",
    description: "Безліміт",
    type: "YEARLY" as const,
    duration_days: 365,
    visits_limit: null,
    price: 14990,
    currency: "UAH",
    is_active: true,
    is_public: true,
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z"
  },
  {
    id: "plan-3",
    title: "Денний",
    description: "8 занять",
    type: "MONTHLY" as const,
    duration_days: 30,
    visits_limit: 8,
    price: 790,
    currency: "UAH",
    is_active: true,
    is_public: false,
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z"
  },
  {
    id: "plan-4",
    title: "Разовий",
    description: "1 відвідування",
    type: "PAY_AS_YOU_GO" as const,
    duration_days: 1,
    visits_limit: 1,
    price: 250,
    currency: "UAH",
    is_active: true,
    is_public: false,
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z"
  }
];

describe("SubscriptionsPage", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: "client-1",
        email: "client@example.com",
        first_name: "Client",
        last_name: "Account",
        role: "CLIENT",
        phone: null,
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
      },
      isAuthenticated: true,
      isReady: true
    });
    getSubscriptionPlansMock.mockReset();
    getSubscriptionsMock.mockReset();
    purchaseSubscriptionMock.mockReset();
    freezeSubscriptionMock.mockReset();
    unfreezeSubscriptionMock.mockReset();
    createMembershipPlanMock.mockReset();
    updateMembershipPlanMock.mockReset();
    deleteMembershipPlanMock.mockReset();
  });

  it("allows purchasing a plan from the available plans table", async () => {
    const user = userEvent.setup();
    getSubscriptionPlansMock.mockResolvedValue(plansFixture);
    getSubscriptionsMock.mockResolvedValue([]);
    purchaseSubscriptionMock.mockResolvedValue({});

    renderWithProviders(<SubscriptionsPage />);

    expect(await screen.findByText("Активних абонементів немає")).toBeInTheDocument();
    const planRow = (await screen.findByText("Разовий")).closest("tr");
    expect(planRow).not.toBeNull();
    await user.click(within(planRow as HTMLElement).getByRole("button", { name: "Купити абонемент" }));

    await waitFor(() => {
      expect(purchaseSubscriptionMock).toHaveBeenCalled();
      expect(purchaseSubscriptionMock.mock.calls[0]?.[0]).toBe("plan-4");
    });
  });

  it("shows freeze flow for active subscription", async () => {
    const user = userEvent.setup();
    getSubscriptionPlansMock.mockResolvedValue(plansFixture.slice(0, 2));
    getSubscriptionsMock.mockResolvedValue([
      {
        id: "subscription-1",
        user_id: "client-1",
        plan_id: "plan-1",
        type: "MONTHLY",
        start_date: "2026-03-01T00:00:00Z",
        end_date: "2026-03-31T00:00:00Z",
        status: "ACTIVE",
        frozen_until: null,
        total_visits: 12,
        remaining_visits: 5,
        plan: plansFixture[0],
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
      }
    ]);
    freezeSubscriptionMock.mockResolvedValue({});

    renderWithProviders(<SubscriptionsPage />);

    await user.click(await screen.findByRole("button", { name: "Заморозити" }));
    await user.click(screen.getByRole("button", { name: "Підтвердити заморозку" }));

    await waitFor(() => {
      expect(freezeSubscriptionMock).toHaveBeenCalled();
      expect(freezeSubscriptionMock.mock.calls[0]?.[0]).toBe("subscription-1");
      expect(freezeSubscriptionMock.mock.calls[0]?.[1]).toBe(7);
    });
  });

  it("shows unfreeze flow for frozen subscription", async () => {
    const user = userEvent.setup();
    getSubscriptionPlansMock.mockResolvedValue(plansFixture.slice(0, 2));
    getSubscriptionsMock.mockResolvedValue([
      {
        id: "subscription-1",
        user_id: "client-1",
        plan_id: "plan-1",
        type: "MONTHLY",
        start_date: "2026-03-01T00:00:00Z",
        end_date: "2026-03-31T00:00:00Z",
        status: "FROZEN",
        frozen_until: "2026-03-15T00:00:00Z",
        total_visits: 12,
        remaining_visits: 5,
        plan: plansFixture[0],
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
      }
    ]);
    unfreezeSubscriptionMock.mockResolvedValue({});

    renderWithProviders(<SubscriptionsPage />);

    const unfreezeBtn = await screen.findByRole("button", { name: "Розморозити" });
    await user.click(unfreezeBtn);

    await waitFor(() => {
      expect(unfreezeSubscriptionMock).toHaveBeenCalledWith("subscription-1");
    });
  });

  it("allows management to create update and delete plans", async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      user: {
        id: "owner-1",
        email: "owner@example.com",
        first_name: "Owner",
        last_name: "Account",
        role: "OWNER",
        phone: null,
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z"
      },
      isAuthenticated: true,
      isReady: true
    });
    getSubscriptionPlansMock.mockResolvedValue(plansFixture);
    getSubscriptionsMock.mockResolvedValue([]);
    createMembershipPlanMock.mockResolvedValue(plansFixture[0]);
    updateMembershipPlanMock.mockResolvedValue(plansFixture[0]);
    deleteMembershipPlanMock.mockResolvedValue(undefined);

    renderWithProviders(<SubscriptionsPage />);

    await user.click(await screen.findByRole("button", { name: "Новий абонемент" }));
    expect(await screen.findByLabelText("Назва")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Публічний план для сайту та покупки"));
    await user.clear(screen.getByLabelText("Назва"));
    await user.type(screen.getByLabelText("Назва"), "Новий абонемент");
    await user.click(screen.getByRole("button", { name: "Створити абонемент" }));

    await waitFor(() => {
      expect(createMembershipPlanMock).toHaveBeenCalled();
      expect(createMembershipPlanMock.mock.calls[0]?.[0]).toMatchObject({
        title: "Новий абонемент",
        is_public: false
      });
    });

    await user.click(screen.getAllByRole("button", { name: "Редагувати" })[0]);
    await user.clear(screen.getByLabelText("Назва"));
    await user.type(screen.getByLabelText("Назва"), "Оновлений план");
    await user.click(screen.getByRole("button", { name: "Зберегти абонемент" }));

    await waitFor(() => {
      expect(updateMembershipPlanMock).toHaveBeenCalled();
      expect(updateMembershipPlanMock.mock.calls[0]?.[0]).toBe("plan-1");
      expect(updateMembershipPlanMock.mock.calls[0]?.[1]).toMatchObject({
        title: "Оновлений план"
      });
    });

    await user.click(screen.getAllByRole("button", { name: "Редагувати" })[0]);
    await user.click(await screen.findByRole("button", { name: "Видалити" }));

    await waitFor(() => {
      expect(deleteMembershipPlanMock).toHaveBeenCalled();
      expect(deleteMembershipPlanMock.mock.calls[0]?.[0]).toBe("plan-1");
    });
  });
});
