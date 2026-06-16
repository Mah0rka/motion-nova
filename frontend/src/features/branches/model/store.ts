import { create } from "zustand";

import {
  clearSelectedBranchId,
  getSelectedBranchId,
  persistSelectedBranchId
} from "../../../shared/lib/branchSelection";

type BranchState = {
  selectedBranchId: string | null;
  setSelectedBranch: (branchId: string | null) => void;
  clearBranchSelection: () => void;
};

export const useBranchStore = create<BranchState>((set) => ({
  selectedBranchId: getSelectedBranchId(),
  setSelectedBranch: (branchId) => {
    persistSelectedBranchId(branchId);
    set({ selectedBranchId: branchId });
  },
  clearBranchSelection: () => {
    clearSelectedBranchId();
    set({ selectedBranchId: null });
  }
}));
