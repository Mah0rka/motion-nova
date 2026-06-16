import { z } from "zod";

export const analyticsMetrics = ["REVENUE", "EXPENSES", "PROFIT", "VISITS"] as const;

const periodRangeSchema = z.object({
  start: z.string(),
  end: z.string()
});

export const overviewReportSchema = z.object({
  period: periodRangeSchema,
  branch_id: z.string().nullable().optional(),
  revenue: z.number(),
  expenses: z.number(),
  profit: z.number(),
  visits: z.number(),
  active_subscriptions: z.number(),
  currency: z.string()
});

export const attendanceReportSchema = z.object({
  period: periodRangeSchema,
  branch_id: z.string().nullable().optional(),
  total: z.number(),
  unique_visitors: z.number(),
  per_day: z.array(z.object({ date: z.string(), count: z.number() }))
});

export const peakHourPointSchema = z.object({
  hour: z.number(),
  visits: z.number()
});

export const classOccupancyRowSchema = z.object({
  class_id: z.string(),
  title: z.string(),
  start_time: z.string(),
  capacity: z.number(),
  booked: z.number(),
  occupancy_pct: z.number()
});

export const trainerPerformanceSchema = z.object({
  trainer_id: z.string(),
  name: z.string(),
  total_attendees: z.number(),
  classes_taught: z.number(),
  average_attendees_per_class: z.number()
});

export const branchComparisonRowSchema = z.object({
  branch_id: z.string(),
  branch_name: z.string(),
  value: z.number()
});

export const periodComparisonReportSchema = z.object({
  metric: z.string(),
  branch_id: z.string().nullable().optional(),
  current_period: periodRangeSchema,
  previous_period: periodRangeSchema,
  current: z.number(),
  previous: z.number(),
  delta: z.number(),
  delta_pct: z.number().nullable()
});

export type AnalyticsMetric = (typeof analyticsMetrics)[number];
export type OverviewReport = z.infer<typeof overviewReportSchema>;
export type AttendanceReport = z.infer<typeof attendanceReportSchema>;
export type PeakHourPoint = z.infer<typeof peakHourPointSchema>;
export type ClassOccupancyRow = z.infer<typeof classOccupancyRowSchema>;
export type TrainerPerformanceReport = z.infer<typeof trainerPerformanceSchema>;
export type BranchComparisonRow = z.infer<typeof branchComparisonRowSchema>;
export type PeriodComparisonReport = z.infer<typeof periodComparisonReportSchema>;
