import type { MembershipPlan, Subscription } from "../../../shared/api";
import type { BadgeTone } from "../../../shared/ui";
import { formatMoney } from "../../../shared/lib/format";

export function getPlanTypeLabel(type: MembershipPlan["type"]): string {
  if (type === "MONTHLY") return "Місячний";
  if (type === "YEARLY") return "Річний";
  return "Разове відвідування";
}

export function getSubscriptionStatusLabel(status: Subscription["status"]): string {
  if (status === "ACTIVE") return "Активний";
  if (status === "FROZEN") return "На паузі";
  return "Завершений";
}

export type PlanStatusKey = "active" | "hidden" | "nonpublic";

export function getPlanStatus(plan: MembershipPlan): { key: PlanStatusKey; label: string; tone: BadgeTone } {
  if (!plan.is_public) return { key: "nonpublic", label: "Непублічний", tone: "warning" };
  return plan.is_active
    ? { key: "active", label: "Активний", tone: "success" }
    : { key: "hidden", label: "Прихований", tone: "neutral" };
}

export function getPlanMeta(plan: MembershipPlan): string {
  const visits = plan.visits_limit ? `${plan.visits_limit} занять` : "Безліміт";
  return `${visits} · ${plan.duration_days} днів · ${formatMoney(plan.price, plan.currency)}`;
}
