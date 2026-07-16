export function localDateForInstant(instant: string, timeZone: string): string {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid instant: ${instant}`);

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function calculateNextStreak(
  current: number,
  lastQualifiedDate: string | null,
  instant: string,
  timeZone: string,
): number {
  const today = localDateForInstant(instant, timeZone);
  if (lastQualifiedDate === today) return current;
  if (!lastQualifiedDate) return 1;

  const previous = new Date(`${today}T00:00:00.000Z`);
  previous.setUTCDate(previous.getUTCDate() - 1);
  return previous.toISOString().slice(0, 10) === lastQualifiedDate
    ? current + 1
    : 1;
}
