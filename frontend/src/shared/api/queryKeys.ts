export const queryKeys = {
  auth: {
    root: () => ["auth"] as const,
    me: () => ["auth", "me"] as const
  },
  ai: {
    root: () => ["ai"] as const
  },
  branches: {
    root: () => ["branches"] as const,
    accessible: (includeInactive = false) => ["branches", "accessible", includeInactive] as const,
    staff: (branchId?: string | null) => ["branches", "staff", branchId ?? ""] as const
  },
  bookings: {
    root: () => ["bookings"] as const,
    mine: () => ["bookings", "mine"] as const
  },
  classes: {
    root: () => ["classes"] as const,
    all: (branchId?: string | null) => ["classes", "all", branchId ?? "ALL"] as const,
    mine: (branchId?: string | null) => ["classes", "mine", branchId ?? ""] as const,
    attendees: (classId?: string | null) => ["classes", "attendees", classId ?? ""] as const
  },
  dashboard: {
    root: () => ["dashboard"] as const,
    schedules: (branchId?: string | null) => ["dashboard", "schedules", branchId ?? "ALL"] as const,
    bookings: () => ["dashboard", "bookings"] as const,
    subscriptions: () => ["dashboard", "subscriptions"] as const,
    payments: () => ["dashboard", "payments"] as const,
    myClasses: (branchId?: string | null) => ["dashboard", "my-classes", branchId ?? ""] as const,
    overview: (branchId?: string | null) => ["dashboard", "overview", branchId ?? "ALL"] as const
  },
  payments: {
    root: () => ["payments"] as const,
    mine: () => ["payments", "mine"] as const,
    ledger: (
      branchId?: string | null,
      userId?: string | null,
      status?: string | null,
      method?: string | null,
      startDate?: string | null,
      endDate?: string | null
    ) => ["payments", "ledger", branchId ?? "ALL", userId ?? null, status ?? null, method ?? null, startDate ?? "", endDate ?? ""] as const
  },
  public: {
    stats: () => ["public", "stats"] as const,
    membershipPlans: () => ["public", "membership-plans"] as const
  },
  analytics: {
    overview: (branchId?: string | null, from?: string | null, to?: string | null) =>
      ["analytics", "overview", branchId ?? "ALL", from ?? "", to ?? ""] as const,
    peakHours: (branchId?: string | null, from?: string | null, to?: string | null) =>
      ["analytics", "peak-hours", branchId ?? "ALL", from ?? "", to ?? ""] as const,
    classOccupancy: (branchId?: string | null, from?: string | null, to?: string | null) =>
      ["analytics", "class-occupancy", branchId ?? "ALL", from ?? "", to ?? ""] as const,
    trainers: (branchId?: string | null) => ["analytics", "trainers", branchId ?? "ALL"] as const,
    comparePeriods: (
      metric: string,
      branchId?: string | null,
      from?: string | null,
      to?: string | null
    ) => ["analytics", "compare-periods", metric, branchId ?? "ALL", from ?? "", to ?? ""] as const,
    compareBranches: (metric: string, from?: string | null, to?: string | null) =>
      ["analytics", "compare-branches", metric, from ?? "", to ?? ""] as const
  },
  schedules: {
    root: () => ["schedules"] as const,
    all: (branchId?: string | null) => ["schedules", "all", branchId ?? "ALL"] as const,
    clientList: (branchId?: string | null) => ["schedules", "client-list", branchId ?? "ALL"] as const,
    calendar: (from: string, to: string, branchId?: string | null) =>
      ["schedules", "calendar", branchId ?? "ALL", from, to] as const,
    trainers: () => ["schedules", "trainers"] as const,
    attendees: (scheduleId?: string | null) => ["schedules", "attendees", scheduleId ?? ""] as const
  },
  subscriptions: {
    root: () => ["subscriptions"] as const,
    plans: () => ["subscriptions", "plans"] as const,
    mine: () => ["subscriptions", "mine"] as const,
    managedAll: (branchId?: string | null) => ["subscriptions", "managed", "all-users", branchId ?? "ALL"] as const,
    managedByUser: (userId?: string | null, branchId?: string | null) =>
      ["subscriptions", "managed", "user", branchId ?? "ALL", userId ?? ""] as const
  },
  visits: {
    root: () => ["visits"] as const,
    active: (branchId?: string | null) => ["visits", "active", branchId ?? "ALL"] as const,
    history: (branchId?: string | null, from?: string | null, to?: string | null) =>
      ["visits", "history", branchId ?? "ALL", from ?? "", to ?? ""] as const,
    checkInBookings: (branchId?: string | null, userId?: string | null) =>
      ["visits", "check-in-bookings", branchId ?? "ALL", userId ?? ""] as const
  },
  expenses: {
    root: () => ["expenses"] as const,
    list: (branchId?: string | null, from?: string | null, to?: string | null) =>
      ["expenses", "list", branchId ?? "ALL", from ?? "", to ?? ""] as const
  },
  users: {
    root: () => ["users"] as const,
    all: () => ["users", "all"] as const,
    list: (role?: string | null) => ["users", "list", role ?? "ALL"] as const,
    page: (role?: string | null, page = 1, pageSize = 10) =>
      ["users", "page", role ?? "ALL", page, pageSize] as const
  }
};
