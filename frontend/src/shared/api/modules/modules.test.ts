import { beforeEach, describe, expect, it, vi } from "vitest";

const requestMock = vi.fn();

vi.mock("../core/http", () => ({ request: (...args: unknown[]) => requestMock(...args) }));

import {
  assignBranchStaff,
  cancelBooking,
  completeSchedule,
  createBooking,
  createBranch,
  createSchedule,
  createUser,
  deleteUser,
  getBranchStaff,
  getBranches,
  getClubStats,
  getCurrentUser,
  getMyBookings,
  getMyPayments,
  getOverview,
  getPublicMembershipPlans,
  getScheduleAttendees,
  getSchedules,
  getSubscriptions,
  getTrainerPerformance,
  getUsers,
  login,
  logout,
  purchaseSubscription,
  register,
  removeBranchStaff,
  removeSchedule,
  updateBranch,
  updateSchedule
} from "../index";

const time = "2026-06-10T10:00:00Z";
const currentUser = {
  id: "user-1", email: "user@example.com", first_name: "User", last_name: "One",
  role: "CLIENT" as const, phone: null, created_at: time, updated_at: time
};
const branch = {
  id: "branch-1", name: "Полтава — Центр", address: "вул. Соборності, 1",
  timezone: "Europe/Kyiv", is_active: true, created_at: time, updated_at: time
};
const schedule = {
  id: "schedule-1", title: "Morning Flow", description: null, trainer_id: "trainer-1",
  branch_id: branch.id, branch, start_time: time, end_time: "2026-06-10T11:00:00Z",
  capacity: 12, type: "GROUP" as const,
  trainer: { id: "trainer-1", first_name: "Ira", last_name: "Coach" },
  completed_at: null, completion_comment: null, completed_by: null,
  bookings: [{ id: "booking-1", user_id: currentUser.id, status: "CONFIRMED" as const }],
  created_at: time, updated_at: time
};
const booking = {
  id: "booking-1", user_id: currentUser.id, class_id: schedule.id, status: "CONFIRMED" as const,
  created_at: time, updated_at: time,
  workout_class: {
    id: schedule.id, title: schedule.title, trainer_id: schedule.trainer_id, branch_id: branch.id,
    branch, start_time: schedule.start_time, end_time: schedule.end_time, capacity: schedule.capacity,
    trainer: schedule.trainer
  }
};
const plan = {
  id: "plan-1", title: "Місячний", description: "12 відвідувань", type: "MONTHLY" as const,
  duration_days: 30, visits_limit: 12, price: 990, currency: "UAH",
  is_active: true, is_public: true, created_at: time, updated_at: time
};
const subscription = {
  id: "subscription-1", user_id: currentUser.id, plan_id: plan.id, type: "MONTHLY" as const,
  start_date: time, end_date: "2026-07-10T10:00:00Z", status: "ACTIVE" as const,
  frozen_until: null, total_visits: 12, remaining_visits: 12, user: currentUser, plan,
  created_at: time, updated_at: time
};
const payment = {
  id: "payment-1", subscription_id: subscription.id, user_id: currentUser.id, branch_id: branch.id, branch,
  amount: 990, currency: "UAH", status: "SUCCESS", method: "CARD", user: currentUser,
  created_at: time, updated_at: time
};
const attendee = {
  id: booking.id, user_id: currentUser.id, status: "CONFIRMED" as const, created_at: time,
  user: { id: currentUser.id, email: currentUser.email, first_name: currentUser.first_name, last_name: currentUser.last_name }
};

describe("api modules", () => {
  beforeEach(() => requestMock.mockReset());

  it("calls auth and user endpoints", async () => {
    requestMock.mockResolvedValueOnce({ user: currentUser });
    await expect(login(currentUser.email, "Password123!")).resolves.toEqual(currentUser);
    requestMock.mockResolvedValueOnce({ user: currentUser });
    await register({ email: currentUser.email, password: "Password123!", first_name: "User", last_name: "One" });
    requestMock.mockResolvedValueOnce(currentUser);
    await getCurrentUser();
    requestMock.mockResolvedValueOnce([currentUser]);
    await getUsers("CLIENT");
    requestMock.mockResolvedValueOnce(currentUser);
    await createUser({ email: "trainer@example.com", password: "Password123!", first_name: "Ira", last_name: "Coach", role: "TRAINER" });
    requestMock.mockResolvedValueOnce(undefined);
    await deleteUser("trainer-1");
    requestMock.mockResolvedValueOnce(undefined);
    await logout();
    expect(requestMock).toHaveBeenCalledWith("/users/trainer-1", { method: "DELETE" });
  });

  it("calls branch endpoints with assignment only", async () => {
    requestMock.mockResolvedValueOnce([branch]); await getBranches();
    requestMock.mockResolvedValueOnce(branch); await createBranch({ name: branch.name, address: branch.address });
    requestMock.mockResolvedValueOnce(branch); await updateBranch(branch.id, { is_active: false });
    requestMock.mockResolvedValueOnce([]); await getBranchStaff(branch.id);
    requestMock.mockResolvedValueOnce({ id: "assignment-1", user_id: "trainer-1", branch_id: branch.id, created_at: time, updated_at: time });
    await assignBranchStaff(branch.id, { user_id: "trainer-1" });
    requestMock.mockResolvedValueOnce(undefined); await removeBranchStaff("assignment-1");
    expect(requestMock).toHaveBeenCalledWith(`/branches/${branch.id}/staff`, { method: "POST", body: JSON.stringify({ user_id: "trainer-1" }) });
  });

  it("calls single-class schedule endpoints", async () => {
    requestMock.mockResolvedValueOnce([schedule]); await getSchedules({ from: time, to: schedule.end_time });
    requestMock.mockResolvedValueOnce([attendee]); await getScheduleAttendees(schedule.id);
    requestMock.mockResolvedValueOnce(schedule); await completeSchedule(schedule.id, { comment: "done" });
    requestMock.mockResolvedValueOnce(schedule); await createSchedule({ title: schedule.title, type: "GROUP", startTime: time, endTime: schedule.end_time, capacity: 12, trainerId: "trainer-1" });
    requestMock.mockResolvedValueOnce(schedule); await updateSchedule(schedule.id, { title: "Updated" });
    requestMock.mockResolvedValueOnce(undefined); await removeSchedule(schedule.id);
    expect(requestMock).toHaveBeenCalledWith(`/schedules/${schedule.id}`, { method: "DELETE" });
  });

  it("calls simple booking and subscription endpoints", async () => {
    requestMock.mockResolvedValueOnce([booking]); await getMyBookings();
    requestMock.mockResolvedValueOnce(booking); await createBooking(schedule.id);
    requestMock.mockResolvedValueOnce(booking); await cancelBooking(booking.id);
    requestMock.mockResolvedValueOnce([subscription]); await getSubscriptions();
    requestMock.mockResolvedValueOnce(subscription); await purchaseSubscription(plan.id);
    expect(requestMock).toHaveBeenCalledWith("/subscriptions/purchase", { method: "POST", body: JSON.stringify({ plan_id: plan.id }) });
  });

  it("calls read-only public, payment and analytics endpoints", async () => {
    requestMock.mockResolvedValueOnce([payment]); await getMyPayments();
    requestMock.mockResolvedValueOnce({ clients_count: 1, trainers_count: 1, classes_next_7_days: 1, active_subscriptions_count: 1 }); await getClubStats();
    requestMock.mockResolvedValueOnce([plan]); await getPublicMembershipPlans();
    requestMock.mockResolvedValueOnce({ period: { start: time, end: schedule.end_time }, branch_id: null, revenue: 990, expenses: 100, profit: 890, visits: 5, active_subscriptions: 3, currency: "UAH" }); await getOverview({ from: time, to: schedule.end_time });
    requestMock.mockResolvedValueOnce([{ trainer_id: "trainer-1", name: "Ira Coach", total_attendees: 1, classes_taught: 1, average_attendees_per_class: 1 }]); await getTrainerPerformance();
  });
});
