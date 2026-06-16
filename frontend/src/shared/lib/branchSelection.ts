export const SELECTED_BRANCH_STORAGE_KEY = "fcms:selected-branch-id";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getSelectedBranchId(): string | null {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(SELECTED_BRANCH_STORAGE_KEY);
}

export function persistSelectedBranchId(branchId: string | null): void {
  if (!canUseStorage()) return;
  if (branchId) {
    window.localStorage.setItem(SELECTED_BRANCH_STORAGE_KEY, branchId);
    return;
  }
  window.localStorage.removeItem(SELECTED_BRANCH_STORAGE_KEY);
}

export function clearSelectedBranchId(): void {
  persistSelectedBranchId(null);
}
