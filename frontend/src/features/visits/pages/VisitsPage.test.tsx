import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { vi } from "vitest";

import { renderWithProviders } from "../../../test/utils";
import { useBranchStore } from "../../branches/model/store";
import { VisitsPage } from "./VisitsPage";

const getVisitHistoryMock = vi.fn();

vi.mock("../../../shared/api", async () => {
  const actual = await vi.importActual<typeof import("../../../shared/api")>("../../../shared/api");
  return {
    ...actual,
    getVisitHistory: (...args: unknown[]) => getVisitHistoryMock(...args)
  };
});

describe("VisitsPage", () => {
  beforeEach(() => {
    useBranchStore.setState({ selectedBranchId: "branch-1" });
    getVisitHistoryMock.mockReset();
  });

  it("renders visit history rows with class and registrar", async () => {
    getVisitHistoryMock.mockResolvedValue([
      {
        id: "visit-1",
        user_id: "client-1",
        branch_id: "branch-1",
        booking_id: "booking-1",
        checked_in_at: "2026-06-08T08:00:00Z",
        checked_out_at: "2026-06-08T09:00:00Z",
        checked_in_by_id: "admin-1",
        created_at: "2026-06-08T08:00:00Z",
        user: {
          id: "client-1",
          email: "client@example.com",
          first_name: "Іван",
          last_name: "Петренко",
          role: "CLIENT",
          phone: null,
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z"
        },
        branch: {
          id: "branch-1",
          name: "Центр",
          address: "вул. Соборності, 1",
          timezone: "Europe/Kyiv",
          is_active: true
        },
        checked_in_by: {
          id: "admin-1",
          email: "admin@example.com",
          first_name: "Адмін",
          last_name: "Облік",
          role: "ADMIN",
          phone: null,
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z"
        },
        workout_class: {
          id: "class-1",
          title: "Ранкова мобілізація",
          type: "GROUP",
          start_time: "2026-06-08T08:00:00Z"
        }
      }
    ]);

    renderWithProviders(<VisitsPage />);

    expect(await screen.findByText("Іван Петренко")).toBeInTheDocument();
    expect(screen.getByText("Ранкова мобілізація")).toBeInTheDocument();
    expect(screen.getByText("Адмін Облік")).toBeInTheDocument();
  });

  it("shows an empty state when there are no visits", async () => {
    getVisitHistoryMock.mockResolvedValue([]);
    renderWithProviders(<VisitsPage />);
    expect(await screen.findByText("За цей період відвідувань немає")).toBeInTheDocument();
  });

  it("filters visits by search term", async () => {
    const user = userEvent.setup();
    getVisitHistoryMock.mockResolvedValue([
      {
        id: "visit-1",
        user_id: "client-1",
        branch_id: "branch-1",
        booking_id: "booking-1",
        checked_in_at: "2026-06-08T08:00:00Z",
        checked_out_at: "2026-06-08T09:00:00Z",
        checked_in_by_id: "admin-1",
        created_at: "2026-06-08T08:00:00Z",
        user: {
          id: "client-1",
          email: "client@example.com",
          first_name: "Іван",
          last_name: "Петренко",
          role: "CLIENT",
          phone: "+380501112233",
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z"
        },
        branch: {
          id: "branch-1",
          name: "Центр",
          address: "вул. Соборності, 1",
          timezone: "Europe/Kyiv",
          is_active: true
        },
        checked_in_by: null,
        workout_class: null
      },
      {
        id: "visit-2",
        user_id: "client-2",
        branch_id: "branch-1",
        booking_id: null,
        checked_in_at: "2026-06-08T10:00:00Z",
        checked_out_at: null,
        checked_in_by_id: "admin-1",
        created_at: "2026-06-08T10:00:00Z",
        user: {
          id: "client-2",
          email: "maria@example.com",
          first_name: "Марія",
          last_name: "Коваль",
          role: "CLIENT",
          phone: "+380671112233",
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z"
        },
        branch: {
          id: "branch-1",
          name: "Центр",
          address: "вул. Соборності, 1",
          timezone: "Europe/Kyiv",
          is_active: true
        },
        checked_in_by: null,
        workout_class: {
          id: "class-2",
          title: "Силове тренування",
          type: "GROUP",
          start_time: "2026-06-08T10:00:00Z"
        }
      }
    ]);

    renderWithProviders(<VisitsPage />);

    expect(await screen.findByText("Іван Петренко")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Пошук"), "Марія");

    expect(screen.getByText("Марія Коваль")).toBeInTheDocument();
    expect(screen.queryByText("Іван Петренко")).not.toBeInTheDocument();
  });
});
