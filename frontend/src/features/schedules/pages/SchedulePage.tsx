import { lazy, Suspense } from "react";

import { useAuthStore } from "../../auth";
import { ClientScheduleView } from "../views/ClientScheduleView";

const StaffScheduleView = lazy(async () => {
  const module = await import("../views/StaffScheduleView");
  return { default: module.StaffScheduleView };
});

export function SchedulePage() {
  const user = useAuthStore((state) => state.user);

  if (user?.role === "CLIENT") {
    return <ClientScheduleView />;
  }

  return (
    <Suspense fallback={null}>
      <StaffScheduleView />
    </Suspense>
  );
}
