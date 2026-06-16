export function isoStart(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString();
}

export function isoEnd(date: string): string {
  return new Date(`${date}T23:59:59`).toISOString();
}

export function todayInput(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysAgoInput(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}
