import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { renderWithProviders } from "../../../test/utils";
import { useBranchStore } from "../../branches/model/store";
import { CheckInPage } from "./CheckInPage";

const getBranchesMock = vi.fn();
const getUsersMock = vi.fn();
const getActiveVisitsMock = vi.fn();
const getCheckInBookingsMock = vi.fn();
const checkInVisitMock = vi.fn();
const checkOutVisitMock = vi.fn();

vi.mock("../../../shared/api", async () => {
  const actual = await vi.importActual<typeof import("../../../shared/api")>("../../../shared/api");
  return {
    ...actual,
    getBranches: () => getBranchesMock(),
    getUsers: (...args: unknown[]) => getUsersMock(...args),
    getActiveVisits: () => getActiveVisitsMock(),
    getCheckInBookings: (...args: unknown[]) => getCheckInBookingsMock(...args),
    checkInVisit: (...args: unknown[]) => checkInVisitMock(...args),
    checkOutVisit: (...args: unknown[]) => checkOutVisitMock(...args)
  };
});

const branchFixture = {
  id: "branch-1",
  name: "Центр",
  address: "вул. Соборності, 1",
  timezone: "Europe/Kyiv",
  is_active: true,
  created_at: "2026-03-01T00:00:00Z",
  updated_at: "2026-03-01T00:00:00Z"
};

const clientFixture = {
  id: "client-1",
  email: "client@example.com",
  first_name: "Іван",
  last_name: "Петренко",
  role: "CLIENT" as const,
  phone: "+380000000000",
  created_at: "2026-03-01T00:00:00Z",
  updated_at: "2026-03-01T00:00:00Z"
};

describe("CheckInPage", () => {
  beforeEach(() => {
    useBranchStore.setState({ selectedBranchId: "branch-1" });
    getBranchesMock.mockReset().mockResolvedValue([branchFixture]);
    getUsersMock.mockReset().mockResolvedValue([clientFixture]);
    getActiveVisitsMock.mockReset().mockResolvedValue([]);
    getCheckInBookingsMock.mockReset().mockResolvedValue([]);
    checkInVisitMock.mockReset().mockResolvedValue({});
    checkOutVisitMock.mockReset().mockResolvedValue({});
  });

  it("prompts to select a branch when none is active", async () => {
    useBranchStore.setState({ selectedBranchId: null });
    renderWithProviders(<CheckInPage />);
    expect(await screen.findByText("Оберіть філію")).toBeInTheDocument();
  });

  it("registers a check-in for the selected client", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CheckInPage />);

    expect(await screen.findByText("Іван Петренко")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Дії" }));
    await user.click(await screen.findByRole("button", { name: "Вхід" }));

    await waitFor(() => {
      expect(checkInVisitMock).toHaveBeenCalledWith({ user_id: "client-1", booking_id: null });
    });
  });

  it("filters check-in clients by id", async () => {
    const user = userEvent.setup();
    getUsersMock.mockResolvedValue([
      clientFixture,
      {
        ...clientFixture,
        id: "client-2",
        email: "client2@example.com",
        first_name: "Марія",
        last_name: "Коваль"
      }
    ]);

    renderWithProviders(<CheckInPage />);

    await user.type(await screen.findByLabelText("Пошук клієнта"), "client-2");

    expect(screen.getByText("Марія Коваль")).toBeInTheDocument();
    expect(screen.queryByText("Іван Петренко")).not.toBeInTheDocument();
  });

  it("shows active visitors with a quick check-out", async () => {
    const user = userEvent.setup();
    getActiveVisitsMock.mockResolvedValue([
      {
        id: "visit-1",
        user_id: "client-1",
        branch_id: "branch-1",
        booking_id: null,
        checked_in_at: "2026-06-10T08:00:00Z",
        checked_out_at: null,
        checked_in_by_id: "admin-1",
        created_at: "2026-06-10T08:00:00Z",
        user: clientFixture,
        branch: branchFixture,
        checked_in_by: null,
        workout_class: null
      }
    ]);

    renderWithProviders(<CheckInPage />);

    await user.click(await screen.findByRole("button", { name: /У залі зараз/ }));
    await user.click(await screen.findByRole("button", { name: "Вихід" }));
    await waitFor(() => {
      expect(checkOutVisitMock).toHaveBeenCalledWith("visit-1");
    });
  });

  it("filters active visitors by search term", async () => {
    const user = userEvent.setup();
    getActiveVisitsMock.mockResolvedValue([
      {
        id: "visit-1",
        user_id: "client-1",
        branch_id: "branch-1",
        booking_id: null,
        checked_in_at: "2026-06-10T08:00:00Z",
        checked_out_at: null,
        checked_in_by_id: "admin-1",
        created_at: "2026-06-10T08:00:00Z",
        user: clientFixture,
        branch: branchFixture,
        checked_in_by: null,
        workout_class: null
      },
      {
        id: "visit-2",
        user_id: "client-2",
        branch_id: "branch-1",
        booking_id: null,
        checked_in_at: "2026-06-10T09:00:00Z",
        checked_out_at: null,
        checked_in_by_id: "admin-1",
        created_at: "2026-06-10T09:00:00Z",
        user: {
          ...clientFixture,
          id: "client-2",
          email: "other@example.com",
          first_name: "Марія",
          last_name: "Коваль"
        },
        branch: branchFixture,
        checked_in_by: null,
        workout_class: null
      }
    ]);

    renderWithProviders(<CheckInPage />);

    await user.click(await screen.findByRole("button", { name: /У залі зараз/ }));
    await user.type(await screen.findByLabelText("Пошук клієнта у залі"), "Марія");

    expect(screen.getByText("Марія Коваль")).toBeInTheDocument();
    expect(screen.queryByText("Іван Петренко")).not.toBeInTheDocument();
  });

  it("filters active visitors by id", async () => {
    const user = userEvent.setup();
    getActiveVisitsMock.mockResolvedValue([
      {
        id: "visit-1",
        user_id: "client-1",
        branch_id: "branch-1",
        booking_id: null,
        checked_in_at: "2026-06-10T08:00:00Z",
        checked_out_at: null,
        checked_in_by_id: "admin-1",
        created_at: "2026-06-10T08:00:00Z",
        user: clientFixture,
        branch: branchFixture,
        checked_in_by: null,
        workout_class: null
      },
      {
        id: "visit-2",
        user_id: "client-2",
        branch_id: "branch-1",
        booking_id: null,
        checked_in_at: "2026-06-10T09:00:00Z",
        checked_out_at: null,
        checked_in_by_id: "admin-1",
        created_at: "2026-06-10T09:00:00Z",
        user: {
          ...clientFixture,
          id: "client-2",
          email: "other@example.com",
          first_name: "Марія",
          last_name: "Коваль"
        },
        branch: branchFixture,
        checked_in_by: null,
        workout_class: null
      }
    ]);

    renderWithProviders(<CheckInPage />);

    await user.click(await screen.findByRole("button", { name: /У залі зараз/ }));
    await user.type(await screen.findByLabelText("Пошук клієнта у залі"), "client-2");

    expect(screen.getByText("Марія Коваль")).toBeInTheDocument();
    expect(screen.queryByText("Іван Петренко")).not.toBeInTheDocument();
  });
});
