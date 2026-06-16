import { screen } from "@testing-library/react";
import { vi } from "vitest";

import { renderWithProviders } from "../../../test/utils";
import { useAuthStore } from "../../auth";
import { ReportsPage } from "./ReportsPage";

const getOverviewMock = vi.fn();
const comparePeriodsMock = vi.fn();
const getPeakHoursMock = vi.fn();
const getClassOccupancyMock = vi.fn();
const getTrainerPerformanceMock = vi.fn();
const compareBranchesMock = vi.fn();

vi.mock("../../../shared/api", async () => {
  const actual = await vi.importActual<typeof import("../../../shared/api")>("../../../shared/api");
  return {
    ...actual,
    getOverview: (...args: unknown[]) => getOverviewMock(...args),
    comparePeriods: (...args: unknown[]) => comparePeriodsMock(...args),
    getPeakHours: (...args: unknown[]) => getPeakHoursMock(...args),
    getClassOccupancy: (...args: unknown[]) => getClassOccupancyMock(...args),
    getTrainerPerformance: () => getTrainerPerformanceMock(),
    compareBranches: (...args: unknown[]) => compareBranchesMock(...args)
  };
});

const period = { start: "2026-05-01T00:00:00Z", end: "2026-05-31T23:59:59Z" };

describe("ReportsPage", () => {
  beforeEach(() => {
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
    getOverviewMock.mockReset().mockResolvedValue({
      period,
      branch_id: null,
      revenue: 5000,
      expenses: 1500,
      profit: 3500,
      visits: 40,
      active_subscriptions: 12,
      currency: "UAH"
    });
    comparePeriodsMock.mockReset().mockResolvedValue({
      metric: "PROFIT",
      branch_id: null,
      current_period: period,
      previous_period: period,
      current: 3500,
      previous: 3000,
      delta: 500,
      delta_pct: 16.7
    });
    getPeakHoursMock.mockReset().mockResolvedValue([
      { hour: 9, visits: 4 },
      { hour: 18, visits: 9 }
    ]);
    getClassOccupancyMock.mockReset().mockResolvedValue([
      {
        class_id: "class-1",
        title: "Йога",
        start_time: "2026-05-10T09:00:00Z",
        capacity: 10,
        booked: 7,
        occupancy_pct: 70
      }
    ]);
    getTrainerPerformanceMock.mockReset().mockResolvedValue([
      {
        trainer_id: "trainer-1",
        name: "Ira Coach",
        total_attendees: 18,
        classes_taught: 6,
        average_attendees_per_class: 3
      }
    ]);
    compareBranchesMock.mockReset().mockResolvedValue([
      { branch_id: "branch-1", branch_name: "Центр", value: 5000 }
    ]);
  });

  it("renders overview, peak hours, occupancy and branch comparison", async () => {
    renderWithProviders(<ReportsPage />);

    expect(await screen.findByText("Йога")).toBeInTheDocument();
    expect(screen.getByText("18:00")).toBeInTheDocument();
    expect(screen.getByText("Ira Coach")).toBeInTheDocument();
    expect(screen.getByText("Центр")).toBeInTheDocument();
    expect(screen.getByText("70%")).toBeInTheDocument();
  });
});
