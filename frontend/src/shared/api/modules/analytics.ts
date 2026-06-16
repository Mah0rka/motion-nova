import { z } from "zod";

import type {
  AnalyticsMetric,
  AttendanceReport,
  BranchComparisonRow,
  ClassOccupancyRow,
  OverviewReport,
  PeakHourPoint,
  PeriodComparisonReport,
  TrainerPerformanceReport
} from "../core/contracts";
import {
  attendanceReportSchema,
  branchComparisonRowSchema,
  classOccupancyRowSchema,
  overviewReportSchema,
  peakHourPointSchema,
  periodComparisonReportSchema,
  trainerPerformanceSchema
} from "../core/contracts";
import { request } from "../core/http";

type Period = { from?: string; to?: string };

function periodQuery(period?: Period): string {
  const params = new URLSearchParams();
  if (period?.from) params.set("from", period.from);
  if (period?.to) params.set("to", period.to);
  return params.size ? `?${params.toString()}` : "";
}

export async function getOverview(period?: Period): Promise<OverviewReport> {
  const data = await request<unknown>(`/analytics/overview${periodQuery(period)}`, { method: "GET" });
  return overviewReportSchema.parse(data);
}

export async function getAttendance(period?: Period): Promise<AttendanceReport> {
  const data = await request<unknown>(`/analytics/attendance${periodQuery(period)}`, { method: "GET" });
  return attendanceReportSchema.parse(data);
}

export async function getPeakHours(period?: Period): Promise<PeakHourPoint[]> {
  const data = await request<unknown>(`/analytics/peak-hours${periodQuery(period)}`, { method: "GET" });
  return z.array(peakHourPointSchema).parse(data);
}

export async function getClassOccupancy(period?: Period): Promise<ClassOccupancyRow[]> {
  const data = await request<unknown>(`/analytics/class-occupancy${periodQuery(period)}`, { method: "GET" });
  return z.array(classOccupancyRowSchema).parse(data);
}

export async function getTrainerPerformance(): Promise<TrainerPerformanceReport[]> {
  const data = await request<unknown>("/analytics/trainers", { method: "GET" });
  return z.array(trainerPerformanceSchema).parse(data);
}

export async function compareBranches(
  metric: AnalyticsMetric,
  period?: Period
): Promise<BranchComparisonRow[]> {
  const params = new URLSearchParams({ metric });
  if (period?.from) params.set("from", period.from);
  if (period?.to) params.set("to", period.to);
  const data = await request<unknown>(`/analytics/compare-branches?${params.toString()}`, { method: "GET" });
  return z.array(branchComparisonRowSchema).parse(data);
}

export async function comparePeriods(
  metric: AnalyticsMetric,
  period?: Period
): Promise<PeriodComparisonReport> {
  const params = new URLSearchParams({ metric });
  if (period?.from) params.set("from", period.from);
  if (period?.to) params.set("to", period.to);
  const data = await request<unknown>(`/analytics/compare-periods?${params.toString()}`, { method: "GET" });
  return periodComparisonReportSchema.parse(data);
}
