type NamedUser = { first_name: string; last_name: string };

export function fullName(user?: NamedUser | null): string {
  return user ? `${user.first_name} ${user.last_name}` : "—";
}

export function formatDateTime(value?: string | null): string {
  return value ? new Date(value).toLocaleString("uk-UA") : "—";
}

export function formatDate(value?: string | null): string {
  return value ? new Date(value).toLocaleDateString("uk-UA") : "—";
}

export function formatAmount(amount: number): string {
  return amount.toLocaleString("uk-UA");
}

export function formatMoney(amount: number, currency: string): string {
  return `${currency} ${formatAmount(amount)}`;
}
