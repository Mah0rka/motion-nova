import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import { useAuthStore } from "../../auth";
import { renderWithProviders } from "../../../test/utils";
import { MyClassesPage } from "./MyClassesPage";

const completeScheduleMock = vi.fn();
const getMyClassesMock = vi.fn();
const getSchedulesMock = vi.fn();
const getScheduleAttendeesMock = vi.fn();

vi.mock("../../../shared/api", async () => {
  const actual = await vi.importActual<typeof import("../../../shared/api")>("../../../shared/api");
  return {
    ...actual,
    completeSchedule: (...args: unknown[]) => completeScheduleMock(...args),
    getMyClasses: () => getMyClassesMock(),
    getSchedules: () => getSchedulesMock(),
    getScheduleAttendees: (...args: unknown[]) => getScheduleAttendeesMock(...args)
  };
});

const now = "2026-03-23T10:00:00Z";

function makeClass(overrides: Record<string, unknown> = {}) {
  return {
    id: "class-1",
    title: "Morning Flow",
    description: null,
    trainer_id: "trainer-1",
    branch_id: "branch-1",
    branch: {
      id: "branch-1",
      name: "Полтава — Центр",
      address: "вул. Соборності, 1",
      timezone: "Europe/Kyiv",
      is_active: true,
      created_at: now,
      updated_at: now
    },
    start_time: "2026-03-23T10:00:00Z",
    end_time: "2026-03-23T11:00:00Z",
    capacity: 12,
    type: "GROUP" as const,
    trainer: { id: "trainer-1", first_name: "Ira", last_name: "Coach" },
    completed_at: null,
    completion_comment: null,
    completed_by: null,
    bookings: [{ id: "booking-1", user_id: "client-1", status: "CONFIRMED" as const }],
    created_at: now,
    updated_at: now,
    ...overrides
  };
}

describe("MyClassesPage", () => {
  beforeEach(() => {
    completeScheduleMock.mockReset();
    getMyClassesMock.mockReset();
    getSchedulesMock.mockReset();
    getScheduleAttendeesMock.mockReset();
  });

  it("shows empty state without classes", async () => {
    useAuthStore.setState({
      user: {
        id: "trainer-1",
        email: "trainer@example.com",
        first_name: "Trainer",
        last_name: "User",
        role: "TRAINER",
        phone: null,
        created_at: now,
        updated_at: now
      },
      isAuthenticated: true,
      isReady: true
    });
    getMyClassesMock.mockResolvedValue([]);

    renderWithProviders(<MyClassesPage />);

    expect(await screen.findByText("У вас немає актуальних занять")).toBeInTheDocument();
  });

  it("shows attendees for selected trainer class", async () => {
    const user = userEvent.setup();
    const startTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const endTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    useAuthStore.setState({
      user: {
        id: "trainer-1",
        email: "trainer@example.com",
        first_name: "Trainer",
        last_name: "User",
        role: "TRAINER",
        phone: null,
        created_at: now,
        updated_at: now
      },
      isAuthenticated: true,
      isReady: true
    });
    getMyClassesMock.mockResolvedValue([
      makeClass({
        start_time: startTime,
        end_time: endTime
      })
    ]);
    getScheduleAttendeesMock.mockResolvedValue([
      {
        id: "booking-1",
        user_id: "client-1",
        status: "CONFIRMED",
        created_at: now,
        user: {
          id: "client-1",
          email: "client@example.com",
          first_name: "Client",
          last_name: "User"
        }
      }
    ]);

    renderWithProviders(<MyClassesPage />);

    await user.click(await screen.findByRole("button", { name: "Деталі заняття" }));

    expect(await screen.findByText("Client User")).toBeInTheDocument();
    expect(screen.getAllByText("Підтверджено").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Morning Flow" })).toBeInTheDocument();
    expect(
      screen.getAllByText(
        new RegExp(`${new Date(startTime).toLocaleString("uk-UA")} - ${new Date(endTime).toLocaleString("uk-UA")}`)
      ).length
    ).toBeGreaterThan(0);
  });

  it("lets trainer confirm completed class with comment", async () => {
    const user = userEvent.setup();
    const endedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const startedAt = new Date(Date.now() - 70 * 60 * 1000).toISOString();

    useAuthStore.setState({
      user: {
        id: "trainer-1",
        email: "trainer@example.com",
        first_name: "Trainer",
        last_name: "User",
        role: "TRAINER",
        phone: null,
        created_at: now,
        updated_at: now
      },
      isAuthenticated: true,
      isReady: true
    });
    getMyClassesMock.mockResolvedValue([
      makeClass({
        start_time: startedAt,
        end_time: endedAt
      })
    ]);
    getScheduleAttendeesMock.mockResolvedValue([]);
    completeScheduleMock.mockResolvedValue(
      makeClass({
        start_time: startedAt,
        end_time: endedAt,
        completed_at: new Date().toISOString(),
        completion_comment: "Усі вправи виконано.",
        completed_by: { id: "trainer-1", first_name: "Trainer", last_name: "User" }
      })
    );

    renderWithProviders(<MyClassesPage />);

    await user.selectOptions(await screen.findByLabelText("Список"), "HISTORY");
    await user.click(await screen.findByRole("button", { name: "Деталі заняття" }));
    await user.type(await screen.findByLabelText("Коментар після заняття"), "Усі вправи виконано.");
    await user.click(screen.getByRole("button", { name: "Підтвердити завершення" }));

    await waitFor(() => {
      expect(completeScheduleMock).toHaveBeenCalledWith("class-1", {
        comment: "Усі вправи виконано."
      });
    });
  });

  it("shows history of all classes for owner", async () => {
    const user = userEvent.setup();
    const endedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const startedAt = new Date(Date.now() - 70 * 60 * 1000).toISOString();

    useAuthStore.setState({
      user: {
        id: "owner-1",
        email: "owner@example.com",
        first_name: "Owner",
        last_name: "Account",
        role: "OWNER",
        phone: null,
        created_at: now,
        updated_at: now
      },
      isAuthenticated: true,
      isReady: true
    });
    getSchedulesMock.mockResolvedValue([
      makeClass({
        id: "class-owner",
        title: "Club History Session",
        start_time: startedAt,
        end_time: endedAt,
        completed_at: new Date().toISOString(),
        completion_comment: "Заняття відбулося за планом.",
        completed_by: { id: "trainer-1", first_name: "Ira", last_name: "Coach" }
      })
    ]);
    getScheduleAttendeesMock.mockResolvedValue([]);

    renderWithProviders(<MyClassesPage />);

    await user.selectOptions(await screen.findByLabelText("Список"), "HISTORY");
    await user.click(await screen.findByRole("button", { name: "Деталі заняття" }));

    expect(await screen.findByRole("heading", { name: "Club History Session" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Заняття відбулося за планом.")).toBeInTheDocument();
  });

  it("shows pending confirmation filter for owner", async () => {
    const user = userEvent.setup();
    const endedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const startedAt = new Date(Date.now() - 70 * 60 * 1000).toISOString();

    useAuthStore.setState({
      user: {
        id: "owner-1",
        email: "owner@example.com",
        first_name: "Owner",
        last_name: "Account",
        role: "OWNER",
        phone: null,
        created_at: now,
        updated_at: now
      },
      isAuthenticated: true,
      isReady: true
    });
    getSchedulesMock.mockResolvedValue([
      makeClass({
        id: "class-pending",
        title: "Pending Session",
        start_time: startedAt,
        end_time: endedAt,
        completed_at: null,
        completion_comment: null,
        completed_by: null
      }),
      makeClass({
        id: "class-history",
        title: "Confirmed Session",
        start_time: startedAt,
        end_time: endedAt,
        completed_at: new Date().toISOString(),
        completion_comment: "Все ок.",
        completed_by: { id: "trainer-1", first_name: "Ira", last_name: "Coach" }
      })
    ]);
    getScheduleAttendeesMock.mockResolvedValue([]);

    renderWithProviders(<MyClassesPage />);

    await user.selectOptions(await screen.findByLabelText("Список"), "PENDING");
    await user.click(await screen.findByRole("button", { name: "Деталі заняття" }));

    expect(await screen.findByRole("heading", { name: "Pending Session" })).toBeInTheDocument();
    expect(screen.queryByText("Confirmed Session")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Коментар після заняття")).toBeInTheDocument();
  });

  it("filters classes by title and date", async () => {
    const user = userEvent.setup();
    const firstStart = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const firstEnd = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();
    const secondStart = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const secondEnd = new Date(Date.now() + 49 * 60 * 60 * 1000).toISOString();
    const firstDate = new Date(firstStart).toLocaleDateString("en-CA");

    useAuthStore.setState({
      user: {
        id: "trainer-1",
        email: "trainer@example.com",
        first_name: "Trainer",
        last_name: "User",
        role: "TRAINER",
        phone: null,
        created_at: now,
        updated_at: now
      },
      isAuthenticated: true,
      isReady: true
    });
    getMyClassesMock.mockResolvedValue([
      makeClass({
        id: "class-flow",
        title: "Morning Flow",
        start_time: firstStart,
        end_time: firstEnd
      }),
      makeClass({
        id: "class-strength",
        title: "Strength Base",
        start_time: secondStart,
        end_time: secondEnd
      })
    ]);
    getScheduleAttendeesMock.mockResolvedValue([]);

    renderWithProviders(<MyClassesPage />);

    await user.type(await screen.findByLabelText("Пошук"), "Morning");
    await user.type(screen.getByLabelText("Дата"), firstDate);

    expect(await screen.findByText("Morning Flow")).toBeInTheDocument();
    expect(screen.queryByText("Strength Base")).not.toBeInTheDocument();
  });
});
