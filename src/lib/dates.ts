// Calendar dates travel through the app as "YYYY-MM-DD" strings and are
// converted to UTC-midnight Date objects only at the database boundary.
// Doing every calculation in UTC means a log entered at 11pm in Boston
// never shifts to the next day because of time zones.

export type ISODate = string;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isValidISODate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  // Round-tripping rejects impossible dates like 2026-02-30.
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function toDate(iso: ISODate): Date {
  if (!isValidISODate(iso)) throw new Error(`Invalid ISO date: ${iso}`);
  return new Date(`${iso}T00:00:00Z`);
}

export function toISODate(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: ISODate, days: number): ISODate {
  return toISODate(new Date(toDate(iso).getTime() + days * MS_PER_DAY));
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / MS_PER_DAY);
}

/** Today's date in UTC. The server uses this; browsers use localTodayISO. */
export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now);
}

/** Today's date in the viewer's own time zone. */
export function localTodayISO(now: Date = new Date()): ISODate {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "2026-10" style month key, or the month containing `iso`. */
export function monthOf(iso: ISODate): string {
  return iso.slice(0, 7);
}

export function isValidMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** Every date shown on a Sunday-first calendar grid for `month` ("YYYY-MM"). */
export function calendarGrid(month: string): ISODate[] {
  const first = `${month}-01`;
  const startOffset = toDate(first).getUTCDay(); // 0 = Sunday
  const gridStart = addDays(first, -startOffset);
  const nextMonth = addMonths(month, 1);
  const daysInView = daysBetween(gridStart, `${nextMonth}-01`);
  const weeks = Math.ceil(daysInView / 7);
  return Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i));
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + delta, 1));
  return toISODate(date).slice(0, 7);
}

export function formatDate(iso: ISODate, options: Intl.DateTimeFormatOptions = {}): string {
  return toDate(iso).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  });
}
