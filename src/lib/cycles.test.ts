import { describe, expect, it } from "vitest";
import {
  computeInsights,
  cycleLengths,
  periodDays,
  periodLength,
  periodsOverlap,
  predictedPeriodDays,
  type PeriodRange,
} from "./cycles";

const p = (startDate: string, endDate: string | null = null): PeriodRange => ({
  startDate,
  endDate,
});

describe("cycleLengths", () => {
  it("measures start-to-start gaps regardless of input order", () => {
    const periods = [p("2026-08-30"), p("2026-07-01"), p("2026-08-02")];
    expect(cycleLengths(periods)).toEqual([32, 28]);
  });

  it("skips gaps long enough to be a missed log", () => {
    const periods = [p("2026-01-01"), p("2026-05-01"), p("2026-05-29")];
    expect(cycleLengths(periods)).toEqual([28]);
  });

  it("returns nothing for fewer than two periods", () => {
    expect(cycleLengths([])).toEqual([]);
    expect(cycleLengths([p("2026-01-01")])).toEqual([]);
  });
});

describe("periodLength", () => {
  it("counts both the first and last day", () => {
    expect(periodLength(p("2026-10-01", "2026-10-05"))).toBe(5);
    expect(periodLength(p("2026-10-01", "2026-10-01"))).toBe(1);
  });

  it("is unknown while a period is ongoing", () => {
    expect(periodLength(p("2026-10-01"))).toBeNull();
  });
});

describe("computeInsights", () => {
  const regular = [
    p("2026-06-01", "2026-06-05"),
    p("2026-06-29", "2026-07-03"),
    p("2026-07-27", "2026-07-31"),
    p("2026-08-24", "2026-08-29"),
  ];

  it("averages cycle and period length and predicts the next start", () => {
    const insights = computeInsights(regular, "2026-09-01");
    expect(insights.averageCycleLength).toBe(28);
    expect(insights.averagePeriodLength).toBe(5); // (5+5+5+6)/4 = 5.25
    expect(insights.predictedNextStart).toBe("2026-09-21");
    expect(insights.daysUntilNext).toBe(20);
    expect(insights.currentCycleDay).toBe(9);
    expect(insights.isVariable).toBe(false);
  });

  it("reports a negative countdown once the predicted date has passed", () => {
    const insights = computeInsights(regular, "2026-09-25");
    expect(insights.daysUntilNext).toBe(-4);
  });

  it("only averages the six most recent cycles", () => {
    // Seven 40-day cycles followed by six 28-day cycles.
    const starts: string[] = [];
    let day = new Date(Date.UTC(2025, 0, 1));
    for (let i = 0; i < 14; i++) {
      starts.push(day.toISOString().slice(0, 10));
      day = new Date(day.getTime() + (i < 7 ? 40 : 28) * 86_400_000);
    }
    const insights = computeInsights(starts.map((s) => p(s)), "2026-06-01");
    expect(insights.recentCycleLengths).toEqual([28, 28, 28, 28, 28, 28]);
    expect(insights.averageCycleLength).toBe(28);
  });

  it("flags cycles whose lengths vary by more than a week", () => {
    const periods = [p("2026-01-01"), p("2026-01-25"), p("2026-03-06")]; // 24, 40
    const insights = computeInsights(periods, "2026-03-10");
    expect(insights.isVariable).toBe(true);
    expect(insights.shortestCycle).toBe(24);
    expect(insights.longestCycle).toBe(40);
  });

  it("can't predict anything from a single period", () => {
    const insights = computeInsights([p("2026-10-01", "2026-10-04")], "2026-10-10");
    expect(insights.periodsLogged).toBe(1);
    expect(insights.averageCycleLength).toBeNull();
    expect(insights.predictedNextStart).toBeNull();
    expect(insights.daysUntilNext).toBeNull();
    expect(insights.averagePeriodLength).toBe(4);
    expect(insights.currentCycleDay).toBe(10);
  });

  it("handles no data at all", () => {
    const insights = computeInsights([], "2026-10-10");
    expect(insights.periodsLogged).toBe(0);
    expect(insights.lastPeriodStart).toBeNull();
    expect(insights.currentCycleDay).toBeNull();
  });
});

describe("calendar helpers", () => {
  it("lists every day of a finished period", () => {
    expect(periodDays(p("2026-10-30", "2026-11-01"), "2026-11-10")).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
  });

  it("draws an ongoing period through today", () => {
    expect(periodDays(p("2026-10-25"), "2026-10-27")).toEqual([
      "2026-10-25",
      "2026-10-26",
      "2026-10-27",
    ]);
  });

  it("uses the average period length for predicted days", () => {
    const insights = computeInsights(
      [p("2026-09-01", "2026-09-03"), p("2026-09-29", "2026-10-01")],
      "2026-10-05",
    );
    expect(predictedPeriodDays(insights)).toEqual(["2026-10-27", "2026-10-28", "2026-10-29"]);
  });
});

describe("periodsOverlap", () => {
  it("detects shared days, including touching edges", () => {
    expect(periodsOverlap(p("2026-10-01", "2026-10-05"), p("2026-10-05", "2026-10-08"))).toBe(true);
    expect(periodsOverlap(p("2026-10-01", "2026-10-05"), p("2026-10-02", "2026-10-03"))).toBe(true);
  });

  it("allows back-to-back periods that don't share a day", () => {
    expect(periodsOverlap(p("2026-10-01", "2026-10-05"), p("2026-10-06", "2026-10-08"))).toBe(false);
  });

  it("treats an ongoing period as its start day", () => {
    expect(periodsOverlap(p("2026-10-01"), p("2026-10-01", "2026-10-03"))).toBe(true);
    expect(periodsOverlap(p("2026-10-01"), p("2026-10-02", "2026-10-03"))).toBe(false);
  });
});
