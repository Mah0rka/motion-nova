import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { logout } from "../../../shared/api";
import { useAuthStore } from "../model/store";

export function LogoutHandler() {
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const navigate = useNavigate();

  useEffect(() => {
    logout()
      .catch(() => undefined)
      .finally(() => {
        clearAuth();
        navigate("/login", { replace: true });
      });
  }, [clearAuth, navigate]);

  return null;
}
