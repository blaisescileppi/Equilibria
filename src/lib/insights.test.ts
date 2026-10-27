import { describe, expect, it } from "vitest";
import { moodCounts, phaseOf, symptomFrequency, symptomsByPhase, type LogSummary } from "./insights";

const periods = [
  { startDate: "2026-09-01", endDate: "2026-09-05" },
  { startDate: "2026-09-29", endDate: "2026-10-03" },
];

describe("phaseOf", () => {
  it("classifies days relative to logged periods", () => {
    expect(phaseOf("2026-09-03", periods)).toBe("period");
    expect(phaseOf("2026-09-24", periods)).toBe("beforePeriod"); // 5 days before Sep 29
    expect(phaseOf("2026-09-28", periods)).toBe("beforePeriod");
    expect(phaseOf("2026-09-23", periods)).toBe("otherDays");
    expect(phaseOf("2026-09-15", periods)).toBe("otherDays");
  });

  it("treats an ongoing period's start day as a period day", () => {
    expect(phaseOf("2026-10-27", [{ startDate: "2026-10-27", endDate: null }])).toBe("period");
  });
});

const log = (date: string, mood: LogSummary["mood"], symptoms: LogSummary["symptoms"] = []): LogSummary => ({
  date,
  mood,
  symptoms,
});

describe("symptom summaries", () => {
  const logs = [
    log("2026-09-02", "LOW", ["CRAMPS", "FATIGUE"]),
    log("2026-09-03", "OKAY", ["CRAMPS"]),
    log("2026-09-26", "OKAY", ["BLOATING", "CRAVINGS"]),
    log("2026-09-27", "LOW", ["BLOATING"]),
    log("2026-09-15", "GREAT"),
  ];

  it("ranks symptoms by frequency with their share of logged days", () => {
    const ranked = symptomFrequency(logs);
    expect(ranked.slice(0, 2)).toEqual([
      { symptom: "BLOATING", count: 2, share: 0.4 },
      { symptom: "CRAMPS", count: 2, share: 0.4 },
    ]);
    expect(symptomFrequency([])).toEqual([]);
  });

  it("groups top symptoms by cycle phase", () => {
    const byPhase = symptomsByPhase(logs, periods);
    expect(byPhase.period.days).toBe(2);
    expect(byPhase.period.top[0]).toMatchObject({ symptom: "CRAMPS", count: 2, share: 1 });
    expect(byPhase.beforePeriod.top[0]).toMatchObject({ symptom: "BLOATING", count: 2 });
    expect(byPhase.otherDays).toEqual({ days: 1, top: [] });
  });

  it("counts moods, including ones never logged", () => {
    expect(moodCounts(logs)).toEqual({ GREAT: 1, GOOD: 0, OKAY: 2, LOW: 2, BAD: 0 });
  });
});
