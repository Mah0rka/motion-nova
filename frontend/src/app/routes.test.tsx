import { appRouter } from "./routes";

interface RouteNode {
  children?: RouteNode[];
  lazy?: () => Promise<any>;
  path?: string;
  Component?: any;
}

function collectRoutes(route: RouteNode): RouteNode[] {
  const current = [route];
  const children = Array.isArray(route.children)
    ? route.children.flatMap((child) => collectRoutes(child))
    : [];

  return current.concat(children);
}

describe("appRouter", () => {
  it("defines top-level routes", () => {
    expect(appRouter).toBeDefined();
    expect(appRouter.routes[0]).toBeDefined();
    expect(appRouter.routes[0]).not.toHaveProperty("hydrateFallbackElement");
  });

  it("loads every lazy route module", async () => {
    const routes = collectRoutes(appRouter.routes[0] as RouteNode);
    const expectedPaths = [
      "/",
      "/login",
      "/dashboard/profile",
      "/dashboard/schedule",
      "/dashboard/bookings",
      "/dashboard/subscriptions",
      "/dashboard/payments",
      "/dashboard/my-classes",
      "/dashboard/branches",
      "/dashboard/reports",
      "/dashboard/users",
      "/dashboard/ai"
    ];

    for (const path of expectedPaths) {
      const route = routes.find(
        (candidate) => "path" in candidate && candidate.path === path
      );

      expect(route).toBeDefined();

      if (typeof route?.lazy === "function") {
        const loaded = await route.lazy();
        expect(loaded).toHaveProperty("Component");
      } else {
        expect(route).toHaveProperty("Component");
      }
    }
  });
});
