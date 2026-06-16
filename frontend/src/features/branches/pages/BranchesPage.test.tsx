import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import { renderWithProviders } from "../../../test/utils";
import { BranchesPage } from "./BranchesPage";

const assignBranchStaffMock = vi.fn();
const createBranchMock = vi.fn();
const getBranchesMock = vi.fn();
const getBranchStaffMock = vi.fn();
const getUsersMock = vi.fn();
const removeBranchStaffMock = vi.fn();
const updateBranchMock = vi.fn();

vi.mock("../../../shared/api", async () => ({
  ...(await vi.importActual<typeof import("../../../shared/api")>("../../../shared/api")),
  assignBranchStaff: (...args: unknown[]) => assignBranchStaffMock(...args),
  createBranch: (...args: unknown[]) => createBranchMock(...args),
  getBranches: (...args: unknown[]) => getBranchesMock(...args),
  getBranchStaff: (...args: unknown[]) => getBranchStaffMock(...args),
  getUsers: (...args: unknown[]) => getUsersMock(...args),
  removeBranchStaff: (...args: unknown[]) => removeBranchStaffMock(...args),
  updateBranch: (...args: unknown[]) => updateBranchMock(...args)
}));

const time = "2026-06-10T10:00:00Z";
const branch = { id: "branch-1", name: "Полтава — Центр", address: "вул. Соборності, 1", timezone: "Europe/Kyiv", is_active: true, created_at: time, updated_at: time };
const trainer = { id: "trainer-1", email: "trainer@example.com", first_name: "Ira", last_name: "Coach", role: "TRAINER", phone: null, created_at: time, updated_at: time };

describe("BranchesPage", () => {
  beforeEach(() => {
    [assignBranchStaffMock, createBranchMock, getBranchesMock, getBranchStaffMock, getUsersMock, removeBranchStaffMock, updateBranchMock].forEach((mock) => mock.mockReset());
    getBranchesMock.mockResolvedValue([branch]);
    getUsersMock.mockResolvedValue([trainer]);
    getBranchStaffMock.mockResolvedValue([]);
  });

  it("creates a branch and assigns an existing staff user", async () => {
    const user = userEvent.setup();
    createBranchMock.mockResolvedValue({ ...branch, id: "branch-2", name: "Поділ" });
    assignBranchStaffMock.mockResolvedValue({ id: "assignment-1", user_id: trainer.id, branch_id: branch.id, user: trainer, created_at: time, updated_at: time });

    renderWithProviders(<BranchesPage />);
    await user.click(await screen.findByRole("button", { name: "Нова філія" }));
    await user.type(screen.getByLabelText("Назва філії"), "Поділ");
    await user.type(screen.getByLabelText("Адреса філії"), "вул. Європейська, 10");
    await user.click(screen.getByRole("button", { name: "Додати філію" }));
    await waitFor(() => expect(createBranchMock).toHaveBeenCalledWith({ name: "Поділ", address: "вул. Європейська, 10" }));

    await user.click((await screen.findAllByRole("button", { name: "Керування філією" }))[0]);
    await user.click(screen.getByRole("button", { name: "Працівники" }));
    await user.selectOptions(screen.getByLabelText("Працівник"), trainer.id);
    await user.click(screen.getByRole("button", { name: "Призначити" }));
    await waitFor(() => expect(assignBranchStaffMock).toHaveBeenCalledWith(branch.id, { user_id: trainer.id }));
  });
});
