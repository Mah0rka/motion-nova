import type { MembershipPlan } from "../../../shared/api";

export type PlanFormState = {
  title: string;
  description: string;
  type: MembershipPlan["type"];
  duration_days: number;
  visits_limit: number;
  price: number;
  currency: string;
  is_active: boolean;
  is_public: boolean;
};

export function emptyPlanForm(): PlanFormState {
  return {
    title: "",
    description: "",
    type: "MONTHLY",
    duration_days: 30,
    visits_limit: 12,
    price: 990,
    currency: "UAH",
    is_active: true,
    is_public: true
  };
}

export function planFormFromPlan(plan: MembershipPlan): PlanFormState {
  return {
    title: plan.title,
    description: plan.description ?? "",
    type: plan.type,
    duration_days: plan.duration_days,
    visits_limit: plan.visits_limit ?? 0,
    price: plan.price,
    currency: plan.currency,
    is_active: plan.is_active,
    is_public: Boolean(plan.is_public)
  };
}

export function buildPlanPayload(form: PlanFormState) {
  return {
    ...form,
    visits_limit: form.visits_limit > 0 ? form.visits_limit : null
  };
}
