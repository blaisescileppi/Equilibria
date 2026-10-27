import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  calendarGrid,
  daysBetween,
  isValidISODate,
  localTodayISO,
  toDate,
} from "./dates";

describe("isValidISODate", () => {
  it("accepts real calendar dates", () => {
    expect(isValidISODate("2026-10-27")).toBe(true);
    expect(isValidISODate("2024-02-29")).toBe(true); // leap year
  });

  it("rejects impossible or malformed dates", () => {
    expect(isValidISODate("2026-02-30")).toBe(false);
    expect(isValidISODate("2025-02-29")).toBe(false);
    expect(isValidISODate("2026-13-01")).toBe(false);
    expect(isValidISODate("10/27/2026")).toBe(false);
    expect(isValidISODate("2026-1-5")).toBe(false);
    expect(isValidISODate("")).toBe(false);
  });
});

describe("date arithmetic", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("is not affected by daylight saving time changes", () => {
    // US clocks change on 2026-11-01; a UTC-only calculation ignores that.
    expect(daysBetween("2026-10-31", "2026-11-02")).toBe(2);
    expect(addDays("2026-03-07", 2)).toBe("2026-03-09");
  });

  it("counts days in either direction", () => {
    expect(daysBetween("2026-10-01", "2026-10-29")).toBe(28);
    expect(daysBetween("2026-10-29", "2026-10-01")).toBe(-28);
  });

  it("converts to UTC midnight", () => {
    expect(toDate("2026-10-27").toISOString()).toBe("2026-10-27T00:00:00.000Z");
    expect(() => toDate("nope")).toThrow();
  });

  it("formats local today without converting to UTC", () => {
    expect(localTodayISO(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });

  it("moves between months", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });
});

describe("calendarGrid", () => {
  it("starts on Sunday and covers whole weeks", () => {
    const grid = calendarGrid("2026-10"); // Oct 1 2026 is a Thursday
    expect(grid[0]).toBe("2026-09-27");
    expect(grid.length % 7).toBe(0);
    expect(grid).toContain("2026-10-31");
    expect(toDate(grid[0]).getUTCDay()).toBe(0);
  });

  it("does not add an empty trailing week", () => {
    const grid = calendarGrid("2026-02"); // Feb 1 2026 is a Sunday, 28 days
    expect(grid.length).toBe(28);
    expect(grid.at(-1)).toBe("2026-02-28");
  });
});
