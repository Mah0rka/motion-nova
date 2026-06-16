import { Navigate, Outlet } from "react-router-dom";

import { useAuthStore } from "../model/store";

export function PublicOnlyLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isReady = useAuthStore((state) => state.isReady);

  if (!isReady) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
