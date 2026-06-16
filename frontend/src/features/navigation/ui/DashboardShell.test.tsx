import userEvent from "@testing-library/user-event";
import { screen, waitFor, within } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import { vi } from "vitest";

import { useAuthStore } from "../../auth";
import { useBranchStore } from "../../branches/model/store";
import { renderWithProviders } from "../../../test/utils";
import { DashboardShell } from "./DashboardShell";

const logoutMock = vi.fn();
const getBranchesMock = vi.fn();

const branchFixture = {
  id: "branch-1",
  name: "Полтава — Центр",
  address: "вул. Соборності, 1",
  timezone: "Europe/Kyiv",
  is_active: true,
  roles: [],
  created_at: "2026-03-23T00:00:00Z",
  updated_at: "2026-03-23T00:00:00Z"
};

vi.mock("../../../shared/api", async () => {
  const actual = await vi.importActual<typeof import("../../../shared/api")>("../../../shared/api");
  return {
    ...actual,
    getBranches: (...args: unknown[]) => getBranchesMock(...args),
    logout: () => logoutMock()
  };
});

describe("DashboardShell", () => {
  beforeEach(() => {
    logoutMock.mockReset();
    getBranchesMock.mockReset();
    getBranchesMock.mockResolvedValue([branchFixture]);
    useBranchStore.getState().clearBranchSelection();
  });

  it("shows only client navigation for client users", () => {
    useAuthStore.setState({
      user: {
        id: "client-1",
        email: "client@example.com",
        first_name: "Client",
        last_name: "User",
        role: "CLIENT",
        phone: null,
        created_at: "2026-03-23T00:00:00Z",
        updated_at: "2026-03-23T00:00:00Z"
      },
      isAuthenticated: true,
      isReady: true
    });

    renderWithProviders(
      <Routes>
        <Route
          path="/dashboard"
          element={
            <DashboardShell>
              <div>dashboard content</div>
            </DashboardShell>
          }
        />
      </Routes>,
      { route: "/dashboard" }
    );

    expect(screen.getByRole("link", { name: "Мої записи" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Учасники" })).not.toBeInTheDocument();
    expect(screen.getByText("dashboard content")).toBeInTheDocument();
  });

  it("keeps logout out of the topbar", () => {
    useAuthStore.setState({
      user: {
        id: "admin-1",
        email: "admin@example.com",
        first_name: "Admin",
        last_name: "User",
        role: "ADMIN",
        phone: null,
        created_at: "2026-03-23T00:00:00Z",
        updated_at: "2026-03-23T00:00:00Z"
      },
      isAuthenticated: true,
      isReady: true
    });

    renderWithProviders(
      <Routes>
        <Route
          path="/dashboard"
          element={
            <DashboardShell>
              <div>dashboard content</div>
            </DashboardShell>
          }
        />
      </Routes>,
      { route: "/dashboard" }
    );

    expect(screen.queryByRole("button", { name: "Вийти" })).not.toBeInTheDocument();
  });

  it("highlights only the exact current navigation item", () => {
    useAuthStore.setState({
      user: {
        id: "owner-1",
        email: "owner@example.com",
        first_name: "Owner",
        last_name: "Account",
        role: "OWNER",
        phone: null,
        created_at: "2026-03-23T00:00:00Z",
        updated_at: "2026-03-23T00:00:00Z"
      },
      isAuthenticated: true,
      isReady: true
    });

    const { container } = renderWithProviders(
      <Routes>
        <Route
          path="/dashboard/schedule"
          element={
            <DashboardShell>
              <div>schedule content</div>
            </DashboardShell>
          }
        />
      </Routes>,
      { route: "/dashboard/schedule" }
    );

    expect(screen.getByRole("link", { name: "Розклад" })).toHaveClass("active");
    expect(screen.getByRole("link", { name: "Аналітика" })).not.toHaveClass("active");
    expect(container.querySelectorAll(".crm-topnav .crm-nav-link.active")).toHaveLength(1);
    expect(container.querySelector(".content-area-wide")).toBeInTheDocument();
  });

  it("opens and closes mobile drawer navigation", async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      user: {
        id: "owner-1",
        email: "owner@example.com",
        first_name: "Owner",
        last_name: "Account",
        role: "OWNER",
        phone: null,
        created_at: "2026-03-23T00:00:00Z",
        updated_at: "2026-03-23T00:00:00Z"
      },
      isAuthenticated: true,
      isReady: true
    });

    renderWithProviders(
      <Routes>
        <Route
          path="/dashboard"
          element={
            <DashboardShell>
              <div>dashboard content</div>
            </DashboardShell>
          }
        />
      </Routes>,
      { route: "/dashboard" }
    );

    await user.click(screen.getByRole("button", { name: "Відкрити меню" }));
    expect(screen.getByRole("dialog", { name: "Навігація кабінету" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Закрити меню" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Навігація кабінету" })).not.toBeInTheDocument();
    });
  });

  it("exposes the profile link inside the mobile drawer", async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      user: {
        id: "owner-1",
        email: "owner@example.com",
        first_name: "Owner",
        last_name: "Account",
        role: "OWNER",
        phone: null,
        created_at: "2026-03-23T00:00:00Z",
        updated_at: "2026-03-23T00:00:00Z"
      },
      isAuthenticated: true,
      isReady: true
    });

    renderWithProviders(
      <Routes>
        <Route
          path="/dashboard"
          element={
            <DashboardShell>
              <div>dashboard content</div>
            </DashboardShell>
          }
        />
      </Routes>,
      { route: "/dashboard" }
    );

    await user.click(screen.getByRole("button", { name: "Відкрити меню" }));
    const dialog = screen.getByRole("dialog", { name: "Навігація кабінету" });
    const profileLink = within(dialog).getByRole("link", { name: "Відкрити профіль" });
    expect(profileLink).toHaveAttribute("href", "/dashboard/profile");
  });

  it("lets owner switch between network-wide and a concrete branch", async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      user: {
        id: "owner-1",
        email: "owner@example.com",
        first_name: "Owner",
        last_name: "Account",
        role: "OWNER",
        phone: null,
        created_at: "2026-03-23T00:00:00Z",
        updated_at: "2026-03-23T00:00:00Z"
      },
      isAuthenticated: true,
      isReady: true
    });

    renderWithProviders(
      <Routes>
        <Route path="/dashboard" element={<DashboardShell><div>dashboard content</div></DashboardShell>} />
      </Routes>,
      { route: "/dashboard" }
    );

    const select = await screen.findByLabelText("Активна філія");
    expect(select).toHaveValue("__NETWORK_WIDE__");
    await screen.findByRole("option", { name: "Полтава — Центр" });
    await user.selectOptions(select, "branch-1");
    expect(useBranchStore.getState().selectedBranchId).toBe("branch-1");
  });

  it("closes mobile drawer with Escape", async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      user: {
        id: "owner-1",
        email: "owner@example.com",
        first_name: "Owner",
        last_name: "Account",
        role: "OWNER",
        phone: null,
        created_at: "2026-03-23T00:00:00Z",
        updated_at: "2026-03-23T00:00:00Z"
      },
      isAuthenticated: true,
      isReady: true
    });

    renderWithProviders(
      <Routes>
        <Route
          path="/dashboard"
          element={
            <DashboardShell>
              <div>dashboard content</div>
            </DashboardShell>
          }
        />
      </Routes>,
      { route: "/dashboard" }
    );

    await user.click(screen.getByRole("button", { name: "Відкрити меню" }));
    expect(screen.getByRole("dialog", { name: "Навігація кабінету" })).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Навігація кабінету" })).not.toBeInTheDocument();
    });
  });
});
