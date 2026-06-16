import { Navigate, Outlet } from "react-router-dom";

import { DashboardShell } from "../../navigation/ui/DashboardShell";
import { useAuthStore } from "../model/store";

export function ProtectedLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isReady = useAuthStore((state) => state.isReady);

  if (!isReady) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DashboardShell>
      <Outlet />
    </DashboardShell>
  );
}
