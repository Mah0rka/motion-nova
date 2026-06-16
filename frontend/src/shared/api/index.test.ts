import * as api from "./index";
import { request, ApiError } from "./core/http";
import { login } from "./modules/auth";
import { getOverview } from "./modules/analytics";
import { checkInVisit } from "./modules/visits";
import { getExpenses } from "./modules/expenses";
import { queryKeys } from "./queryKeys";

describe("shared/api barrel", () => {
  it("re-exports http helpers and module APIs", () => {
    expect(api.request).toBe(request);
    expect(api.ApiError).toBe(ApiError);
    expect(api.login).toBe(login);
    expect(api.getOverview).toBe(getOverview);
    expect(api.checkInVisit).toBe(checkInVisit);
    expect(api.getExpenses).toBe(getExpenses);
    expect(api.queryKeys).toBe(queryKeys);
  });

  it("keeps centralized query key factories stable", () => {
    expect(api.queryKeys.dashboard.overview()).toEqual(["dashboard", "overview", "ALL"]);
    expect(api.queryKeys.analytics.overview()).toEqual(["analytics", "overview", "ALL", "", ""]);
    expect(api.queryKeys.schedules.calendar("from", "to")).toEqual([
      "schedules",
      "calendar",
      "ALL",
      "from",
      "to"
    ]);
    expect(api.queryKeys.users.list()).toEqual(["users", "list", "ALL"]);
  });
});
