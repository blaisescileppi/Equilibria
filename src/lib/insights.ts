import type { Mood, Symptom } from "@/generated/prisma/enums";
import { addDays, type ISODate } from "./dates";
import { sortByStart, type PeriodRange } from "./cycles";

// Pure summaries of daily logs for the insights page.

export type LogSummary = { date: ISODate; mood: Mood; symptoms: Symptom[] };
export type Phase = "period" | "beforePeriod" | "otherDays";

/** Days before a period start that count as "before your period". */
export const BEFORE_PERIOD_DAYS = 5;

export function phaseOf(date: ISODate, periods: PeriodRange[]): Phase {
  for (const period of periods) {
    const end = period.endDate ?? period.startDate;
    if (date >= period.startDate && date <= end) return "period";
  }
  for (const period of sortByStart(periods)) {
    if (date >= addDays(period.startDate, -BEFORE_PERIOD_DAYS) && date < period.startDate) {
      return "beforePeriod";
    }
  }
  return "otherDays";
}

export type SymptomCount = { symptom: Symptom; count: number; share: number };

/** Symptoms ranked by how often they were logged, with the share of days. */
export function symptomFrequency(logs: LogSummary[]): SymptomCount[] {
  const counts = new Map<Symptom, number>();
  for (const log of logs) {
    for (const symptom of log.symptoms) counts.set(symptom, (counts.get(symptom) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([symptom, count]) => ({ symptom, count, share: logs.length ? count / logs.length : 0 }))
    .sort((a, b) => b.count - a.count || a.symptom.localeCompare(b.symptom));
}

export function symptomsByPhase(logs: LogSummary[], periods: PeriodRange[]) {
  const groups: Record<Phase, LogSummary[]> = { period: [], beforePeriod: [], otherDays: [] };
  for (const log of logs) groups[phaseOf(log.date, periods)].push(log);
  return {
    period: { days: groups.period.length, top: symptomFrequency(groups.period).slice(0, 3) },
    beforePeriod: { days: groups.beforePeriod.length, top: symptomFrequency(groups.beforePeriod).slice(0, 3) },
    otherDays: { days: groups.otherDays.length, top: symptomFrequency(groups.otherDays).slice(0, 3) },
  };
}

export function moodCounts(logs: LogSummary[]): Record<Mood, number> {
  const counts: Record<Mood, number> = { GREAT: 0, GOOD: 0, OKAY: 0, LOW: 0, BAD: 0 };
  for (const log of logs) counts[log.mood] += 1;
  return counts;
}
