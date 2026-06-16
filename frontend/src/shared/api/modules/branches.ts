import { z } from "zod";

import type { Branch, StaffBranchAssignment } from "../core/contracts";
import { branchSchema, staffBranchAssignmentSchema } from "../core/contracts";
import { request } from "../core/http";

export async function getBranches(includeInactive = false): Promise<Branch[]> {
  const suffix = includeInactive ? "?includeInactive=true" : "";
  const data = await request<unknown>(`/branches${suffix}`, { method: "GET" });
  return z.array(branchSchema).parse(data);
}

export async function createBranch(payload: {
  name: string;
  address: string;
  timezone?: string;
}): Promise<Branch> {
  const data = await request<unknown>("/branches", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return branchSchema.parse(data);
}

export async function updateBranch(
  branchId: string,
  payload: Partial<Pick<Branch, "name" | "address" | "timezone" | "is_active">>
): Promise<Branch> {
  const data = await request<unknown>(`/branches/${branchId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
  return branchSchema.parse(data);
}

export async function getBranchStaff(branchId: string): Promise<StaffBranchAssignment[]> {
  const data = await request<unknown>(`/branches/${branchId}/staff`, { method: "GET" });
  return z.array(staffBranchAssignmentSchema).parse(data);
}

export async function assignBranchStaff(
  branchId: string,
  payload: { user_id: string }
): Promise<StaffBranchAssignment> {
  const data = await request<unknown>(`/branches/${branchId}/staff`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return staffBranchAssignmentSchema.parse(data);
}

export async function removeBranchStaff(assignmentId: string): Promise<void> {
  await request<void>(`/branches/staff/${assignmentId}`, { method: "DELETE" });
}
