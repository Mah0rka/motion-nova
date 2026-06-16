import {
  dashboardRouteMetadata,
  findDashboardRoute,
  getDashboardRoute,
  navigationItems
} from "./navigation.config";

describe("dashboard route metadata", () => {
  it("keeps route ids and paths unique", () => {
    expect(new Set(dashboardRouteMetadata.map((route) => route.id)).size).toBe(dashboardRouteMetadata.length);
    expect(new Set(dashboardRouteMetadata.map((route) => route.path)).size).toBe(dashboardRouteMetadata.length);
  });

  it("derives top navigation from route metadata", () => {
    expect(navigationItems.map((route) => route.id)).toContain("reports");
    expect(navigationItems.map((route) => route.id)).toContain("ai");
    expect(navigationItems.every((route) => route.showInNavigation)).toBe(true);
    expect(navigationItems.map((route) => route.id)).not.toContain("profile");
  });

  it("stores access and workspace metadata centrally", () => {
    expect(getDashboardRoute("reports").roles).toEqual(["ADMIN", "OWNER"]);
    expect(getDashboardRoute("ai").roles).toEqual(["OWNER"]);
    expect(getDashboardRoute("schedule").wideWorkspace).toBe(true);
    expect(findDashboardRoute("/dashboard/subscriptions")?.id).toBe("subscriptions");
  });
});
