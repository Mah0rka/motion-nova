import userEvent from "@testing-library/user-event";
import { screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";

import { HomePage } from "./HomePage";
import { useAuthStore } from "../../auth";
import { renderWithProviders } from "../../../test/utils";

const getPublicMembershipPlansMock = vi.fn();

vi.mock("../../../shared/api", async () => {
  const actual = await vi.importActual<typeof import("../../../shared/api")>("../../../shared/api");
  return {
    ...actual,
    getPublicMembershipPlans: () => getPublicMembershipPlansMock()
  };
});

const plansFixture = [
  {
    id: "plan-1",
    title: "Місячний",
    description: "Доступ на 30 днів",
    type: "MONTHLY",
    duration_days: 30,
    visits_limit: 12,
    price: 990,
    currency: "UAH",
    is_active: true,
    is_public: true,
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z"
  }
];

describe("HomePage", () => {
  beforeEach(() => {
    getPublicMembershipPlansMock.mockReset();
    getPublicMembershipPlansMock.mockResolvedValue(plansFixture);
  });

  it("opens the plans modal for guests and links each plan to login", async () => {
    const user = userEvent.setup();
    useAuthStore.setState({ user: null, isAuthenticated: false, isReady: true });

    renderWithProviders(<HomePage />);

    const plansButtons = await screen.findAllByRole("button", { name: "Абонементи" });
    await user.click(plansButtons[0]);

    const dialog = await screen.findByRole("dialog", { name: "Абонементи" });
    expect(await within(dialog).findByRole("heading", { name: "Місячний" })).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Оформити" })).toHaveAttribute("href", "/login");
  });

  it("shows greeting and dashboard link for authenticated users", async () => {
    useAuthStore.setState({
      user: {
        id: "user-1",
        email: "client@example.com",
        first_name: "Влад",
        last_name: "Ковальов",
        role: "CLIENT",
        phone: null,
        created_at: "2026-03-23T00:00:00Z",
        updated_at: "2026-03-23T00:00:00Z"
      },
      isAuthenticated: true,
      isReady: true
    });

    renderWithProviders(<HomePage />);

    expect(await screen.findByRole("link", { name: /Привіт, Влад/i })).toHaveAttribute(
      "href",
      "/dashboard"
    );
  });

  it("opens and closes mobile marketing navigation drawer", async () => {
    const user = userEvent.setup();
    useAuthStore.setState({ user: null, isAuthenticated: false, isReady: true });

    renderWithProviders(<HomePage />);

    await user.click(await screen.findByRole("button", { name: "Відкрити меню" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "03Простір" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Закрити меню" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
