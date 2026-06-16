import type { UserRole } from "../../shared/api";
import {
  allRoles,
  clientAndManagementRoles,
  clientRoles,
  managementRoles,
  trainerAndManagementRoles
} from "../auth/lib/roles";

export type DashboardRouteId =
  | "profile"
  | "schedule"
  | "bookings"
  | "subscriptions"
  | "payments"
  | "myClasses"
  | "checkIn"
  | "visits"
  | "expenses"
  | "ai"
  | "users"
  | "branches"
  | "reports";

export type DashboardRouteMetadata = {
  id: DashboardRouteId;
  path: string;
  label: string;
  roles: readonly UserRole[];
  showInNavigation: boolean;
  wideWorkspace?: boolean;
};

export type NavigationItem = DashboardRouteMetadata;

export const dashboardRouteMetadata: DashboardRouteMetadata[] = [
  { id: "schedule", path: "/dashboard/schedule", label: "Розклад", roles: allRoles, showInNavigation: true, wideWorkspace: true },
  { id: "bookings", path: "/dashboard/bookings", label: "Мої записи", roles: clientRoles, showInNavigation: true },
  { id: "subscriptions", path: "/dashboard/subscriptions", label: "Абонементи", roles: clientAndManagementRoles, showInNavigation: true },
  { id: "payments", path: "/dashboard/payments", label: "Оплати", roles: clientAndManagementRoles, showInNavigation: true },
  { id: "myClasses", path: "/dashboard/my-classes", label: "Класи", roles: trainerAndManagementRoles, showInNavigation: true },
  { id: "checkIn", path: "/dashboard/check-in", label: "Рецепція", roles: managementRoles, showInNavigation: true },
  { id: "visits", path: "/dashboard/visits", label: "Відвідування", roles: managementRoles, showInNavigation: true },
  { id: "users", path: "/dashboard/users", label: "Учасники", roles: managementRoles, showInNavigation: true },
  { id: "branches", path: "/dashboard/branches", label: "Філії", roles: ["OWNER"], showInNavigation: true },
  { id: "expenses", path: "/dashboard/expenses", label: "Витрати", roles: managementRoles, showInNavigation: true },
  { id: "reports", path: "/dashboard/reports", label: "Аналітика", roles: managementRoles, showInNavigation: true },
  { id: "ai", path: "/dashboard/ai", label: "AI-агент", roles: ["OWNER"], showInNavigation: true },
  { id: "profile", path: "/dashboard/profile", label: "Профіль", roles: allRoles, showInNavigation: false }
];

const routeMetadataById = new Map(
  dashboardRouteMetadata.map((route) => [route.id, route] as const)
);

export const navigationItems: NavigationItem[] = dashboardRouteMetadata.filter(
  (route) => route.showInNavigation
);

export function getDashboardRoute(id: DashboardRouteId): DashboardRouteMetadata {
  const route = routeMetadataById.get(id);
  if (!route) throw new Error(`Unknown dashboard route: ${id}`);
  return route;
}

export function findDashboardRoute(pathname: string): DashboardRouteMetadata | undefined {
  return dashboardRouteMetadata.find((route) => route.path === pathname);
}
