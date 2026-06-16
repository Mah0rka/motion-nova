import { forwardRef, useEffect, useImperativeHandle } from "react";
import userEvent from "@testing-library/user-event";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";

import { renderWithProviders } from "../../../test/utils";
import { useAuthStore } from "../../auth";
import { SchedulePage } from "./SchedulePage";

const createBookingMock = vi.fn();
const createScheduleMock = vi.fn();
const getScheduleAttendeesMock = vi.fn();
const getSchedulesMock = vi.fn();
const getUsersMock = vi.fn();
const removeScheduleMock = vi.fn();
const updateScheduleMock = vi.fn();

vi.mock("@fullcalendar/interaction", () => ({ default: {} }));
vi.mock("@fullcalendar/timegrid", () => ({ default: {} }));
vi.mock("@fullcalendar/core/locales/uk", () => ({ default: {} }));
vi.mock("@fullcalendar/react", () => {
  const MockCalendar = forwardRef(function MockCalendar(props: Record<string, unknown>, ref) {
    useImperativeHandle(ref, () => ({ getApi: () => ({ prev: vi.fn(), next: vi.fn(), today: vi.fn(), changeView: vi.fn() }) }));
    useEffect(() => {
      (props.datesSet as ((value: unknown) => void) | undefined)?.({
        start: new Date("2026-06-08T00:00:00Z"),
        end: new Date("2026-06-15T00:00:00Z"),
        view: { title: "08 – 14 червня 2026" }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (
      <div data-testid="fullcalendar">
        <button type="button" onClick={() => (props.select as ((value: unknown) => void) | undefined)?.({ start: new Date("2026-06-10T10:00:00Z"), end: new Date("2026-06-10T11:00:00Z") })}>mock-select</button>
        {Array.isArray(props.events) ? props.events.map((event: Record<string, unknown>) => (
          <button key={String(event.id)} type="button" onClick={() => (props.eventClick as ((value: unknown) => void) | undefined)?.({ event: { extendedProps: event.extendedProps } })}>{String(event.title)}</button>
        )) : null}
      </div>
    );
  });
  return { default: MockCalendar };
});

vi.mock("../../../shared/api", async () => ({
  ...(await vi.importActual<typeof import("../../../shared/api")>("../../../shared/api")),
  createBooking: (...args: unknown[]) => createBookingMock(...args),
  createSchedule: (...args: unknown[]) => createScheduleMock(...args),
  getScheduleAttendees: (...args: unknown[]) => getScheduleAttendeesMock(...args),
  getSchedules: (...args: unknown[]) => getSchedulesMock(...args),
  getUsers: (...args: unknown[]) => getUsersMock(...args),
  removeSchedule: (...args: unknown[]) => removeScheduleMock(...args),
  updateSchedule: (...args: unknown[]) => updateScheduleMock(...args)
}));

const now = "2026-06-10T10:00:00Z";
const schedule = {
  id: "schedule-1", title: "HIIT", description: null, trainer_id: "trainer-1", branch_id: "branch-1",
  branch: { id: "branch-1", name: "Полтава — Центр", address: "вул. Соборності, 1", timezone: "Europe/Kyiv", is_active: true },
  start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  end_time: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
  capacity: 10, type: "GROUP" as const,
  trainer: { id: "trainer-1", first_name: "Ira", last_name: "Coach" },
  bookings: [], created_at: now, updated_at: now
};
const trainer = { id: "trainer-1", email: "trainer@example.com", first_name: "Ira", last_name: "Coach", role: "TRAINER" as const, phone: null, created_at: now, updated_at: now };

function authenticate(role: "CLIENT" | "TRAINER" | "ADMIN") {
  useAuthStore.setState({
    user: { id: role === "TRAINER" ? trainer.id : `${role.toLowerCase()}-1`, email: `${role.toLowerCase()}@example.com`, first_name: role, last_name: "User", role, phone: null, created_at: now, updated_at: now },
    isAuthenticated: true,
    isReady: true
  });
}

describe("SchedulePage", () => {
  beforeEach(() => {
    [createBookingMock, createScheduleMock, getScheduleAttendeesMock, getSchedulesMock, getUsersMock, removeScheduleMock, updateScheduleMock].forEach((mock) => mock.mockReset());
    getScheduleAttendeesMock.mockResolvedValue([]);
    getUsersMock.mockResolvedValue([trainer]);
  });

  it("keeps client booking flow simple", async () => {
    authenticate("CLIENT");
    getSchedulesMock.mockResolvedValue([schedule]);
    createBookingMock.mockResolvedValue({});
    const user = userEvent.setup();
    renderWithProviders(<SchedulePage />);
    expect(await screen.findByText("HIIT")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Записатись" }));
    await waitFor(() => expect(createBookingMock.mock.calls[0]?.[0]).toBe(schedule.id));
  });

  it("renders read-only calendar for trainer", async () => {
    authenticate("TRAINER");
    getSchedulesMock.mockResolvedValue([schedule]);
    const user = userEvent.setup();
    renderWithProviders(<SchedulePage />);
    expect(await screen.findByTestId("fullcalendar")).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "HIIT" }));
    const dialog = await screen.findByRole("dialog", { name: "HIIT" });
    expect(within(dialog).queryByRole("button", { name: "Зберегти" })).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText("Назва")).toBeDisabled();
  });

  it("lets admin create a single class", async () => {
    authenticate("ADMIN");
    getSchedulesMock.mockResolvedValue([schedule]);
    createScheduleMock.mockResolvedValue(schedule);
    const user = userEvent.setup();
    renderWithProviders(<SchedulePage />);
    await user.click(await screen.findByRole("button", { name: "mock-select" }));
    const dialog = await screen.findByRole("dialog", { name: "Створити заняття" });
    fireEvent.change(within(dialog).getByLabelText("Назва"), { target: { value: "Cycle" } });
    fireEvent.change(within(dialog).getByLabelText("Тренер"), { target: { value: trainer.id } });
    await user.click(within(dialog).getByRole("button", { name: "Зберегти" }));
    await waitFor(() => expect(createScheduleMock.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ title: "Cycle", trainerId: trainer.id })));
  });
});
