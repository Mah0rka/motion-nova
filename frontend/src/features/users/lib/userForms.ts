import type { CurrentUser, Subscription, UserRole } from "../../../shared/api";

export const roles: UserRole[] = ["CLIENT", "TRAINER", "ADMIN", "OWNER"];

export type EditableSubscriptionStatus = "ACTIVE" | "FROZEN" | "EXPIRED";

export type ParticipantSection = "issue" | "subscriptions" | "payments";

export function getAccessLabel(role: UserRole): string {
  if (role === "CLIENT") return "Клієнт";
  if (role === "TRAINER") return "Тренер";
  if (role === "ADMIN") return "Адміністратор";
  return "Власник";
}

export function getSubscriptionPriority(subscription: Subscription): number {
  if (subscription.status === "ACTIVE") return 4;
  if (subscription.status === "FROZEN") return 3;
  if (subscription.status === "EXPIRED") return 2;
  return 1;
}

export function getUserSearchValue(user: CurrentUser): string {
  return [user.first_name, user.last_name, user.phone ?? ""].join(" ");
}

export type CreateUserForm = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: UserRole;
};

export function emptyCreateForm(): CreateUserForm {
  return {
    email: "",
    password: "Password123!",
    first_name: "",
    last_name: "",
    phone: "",
    role: "CLIENT"
  };
}

export type EditUserForm = {
  first_name: string;
  last_name: string;
  phone: string;
  role: UserRole;
};

export function emptyEditForm(): EditUserForm {
  return { first_name: "", last_name: "", phone: "", role: "CLIENT" };
}

export function editFormFromUser(user: CurrentUser): EditUserForm {
  return {
    first_name: user.first_name,
    last_name: user.last_name,
    phone: user.phone ?? "",
    role: user.role
  };
}

export type SubscriptionFormState = {
  plan_id: string;
  start_date: string;
  end_date: string;
  status: EditableSubscriptionStatus;
  total_visits: string;
  remaining_visits: string;
};

export function emptySubscriptionForm(): SubscriptionFormState {
  return {
    plan_id: "",
    start_date: "",
    end_date: "",
    status: "ACTIVE",
    total_visits: "",
    remaining_visits: ""
  };
}

export function subscriptionFormFromSubscription(subscription: Subscription): SubscriptionFormState {
  return {
    plan_id: subscription.plan_id ?? "",
    start_date: subscription.start_date.slice(0, 16),
    end_date: subscription.end_date.slice(0, 16),
    status: subscription.status as EditableSubscriptionStatus,
    total_visits: subscription.total_visits === null ? "" : String(subscription.total_visits),
    remaining_visits: subscription.remaining_visits === null ? "" : String(subscription.remaining_visits)
  };
}

function toIsoOrUndefined(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

function toCountOrNull(value: string): number | null {
  return value === "" ? null : Number(value);
}

export function buildSubscriptionUpdatePayload(form: SubscriptionFormState) {
  return {
    plan_id: form.plan_id || undefined,
    start_date: toIsoOrUndefined(form.start_date),
    end_date: toIsoOrUndefined(form.end_date),
    status: form.status,
    total_visits: toCountOrNull(form.total_visits),
    remaining_visits: toCountOrNull(form.remaining_visits)
  };
}

export function buildIssuePayload(form: SubscriptionFormState, userId: string) {
  return {
    ...buildSubscriptionUpdatePayload(form),
    user_id: userId,
    plan_id: form.plan_id
  };
}
