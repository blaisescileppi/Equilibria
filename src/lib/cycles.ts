import { addDays, daysBetween, type ISODate } from "./dates";

// Pure cycle math. Nothing here touches the database, so every rule can be
// unit tested with plain arrays.

export type PeriodRange = { startDate: ISODate; endDate: ISODate | null };

/** How many recent cycles feed the averages. Recent cycles predict better. */
export const CYCLES_FOR_AVERAGE = 6;

/**
 * Gaps longer than this are treated as a missed log rather than a real
 * cycle, so one forgotten month doesn't double the average.
 */
export const MAX_COUNTED_CYCLE_LENGTH = 90;

/** Spread (longest minus shortest) above this is reported as variable. */
export const VARIABILITY_THRESHOLD_DAYS = 7;

export type CycleInsights = {
  periodsLogged: number;
  lastPeriodStart: ISODate | null;
  currentCycleDay: number | null;
  averageCycleLength: number | null;
  averagePeriodLength: number | null;
  shortestCycle: number | null;
  longestCycle: number | null;
  isVariable: boolean;
  predictedNextStart: ISODate | null;
  daysUntilNext: number | null;
  recentCycleLengths: number[];
};

export function sortByStart<T extends PeriodRange>(periods: T[]): T[] {
  return [...periods].sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/** Length of each cycle: days from one period start to the next. */
export function cycleLengths(periods: PeriodRange[]): number[] {
  const sorted = sortByStart(periods);
  const lengths: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const length = daysBetween(sorted[i - 1].startDate, sorted[i].startDate);
    if (length <= MAX_COUNTED_CYCLE_LENGTH) lengths.push(length);
  }
  return lengths;
}

/** Days of bleeding, counting both ends. Null while a period is ongoing. */
export function periodLength(period: PeriodRange): number | null {
  if (!period.endDate) return null;
  return daysBetween(period.startDate, period.endDate) + 1;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

export function computeInsights(periods: PeriodRange[], today: ISODate): CycleInsights {
  const sorted = sortByStart(periods);
  const last = sorted.at(-1) ?? null;
  const recentCycleLengths = cycleLengths(sorted).slice(-CYCLES_FOR_AVERAGE);
  const recentPeriodLengths = sorted
    .slice(-CYCLES_FOR_AVERAGE)
    .map(periodLength)
    .filter((n): n is number => n !== null);

  const averageCycleLength = average(recentCycleLengths);
  const shortestCycle = recentCycleLengths.length ? Math.min(...recentCycleLengths) : null;
  const longestCycle = recentCycleLengths.length ? Math.max(...recentCycleLengths) : null;

  const predictedNextStart =
    last && averageCycleLength !== null ? addDays(last.startDate, averageCycleLength) : null;

  return {
    periodsLogged: sorted.length,
    lastPeriodStart: last?.startDate ?? null,
    currentCycleDay: last ? daysBetween(last.startDate, today) + 1 : null,
    averageCycleLength,
    averagePeriodLength: average(recentPeriodLengths),
    shortestCycle,
    longestCycle,
    isVariable:
      shortestCycle !== null &&
      longestCycle !== null &&
      longestCycle - shortestCycle > VARIABILITY_THRESHOLD_DAYS,
    predictedNextStart,
    // Negative means the predicted date has passed.
    daysUntilNext: predictedNextStart ? daysBetween(today, predictedNextStart) : null,
    recentCycleLengths,
  };
}

/** The days a period covers; an ongoing period is drawn through `today`. */
export function periodDays(period: PeriodRange, today: ISODate): ISODate[] {
  const end = period.endDate ?? (today >= period.startDate ? today : period.startDate);
  const length = daysBetween(period.startDate, end) + 1;
  return Array.from({ length }, (_, i) => addDays(period.startDate, i));
}

/** Predicted bleeding days for the next period, for the calendar. */
export function predictedPeriodDays(insights: CycleInsights): ISODate[] {
  if (!insights.predictedNextStart) return [];
  const length = insights.averagePeriodLength ?? 5;
  return Array.from({ length }, (_, i) => addDays(insights.predictedNextStart!, i));
}

/** True if two periods share at least one day. An ongoing period counts as its start day. */
export function periodsOverlap(a: PeriodRange, b: PeriodRange): boolean {
  const aEnd = a.endDate ?? a.startDate;
  const bEnd = b.endDate ?? b.startDate;
  return a.startDate <= bEnd && b.startDate <= aEnd;
}
