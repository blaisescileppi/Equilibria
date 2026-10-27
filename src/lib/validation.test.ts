import { describe, expect, it } from "vitest";
import { addDays, todayISO } from "./dates";
import { emptyNutrients } from "./nutrition";
import {
  cycleSchema,
  dailyLogSchema,
  fieldErrors,
  foodSchema,
  mealEntrySchema,
  postQuerySchema,
  postSchema,
  signupSchema,
} from "./validation";

describe("signupSchema", () => {
  it("normalizes email and trims the display name", () => {
    const parsed = signupSchema.parse({
      email: "  Ada@Example.COM ",
      password: "correct horse",
      displayName: "  Ada  ",
    });
    expect(parsed.email).toBe("ada@example.com");
    expect(parsed.displayName).toBe("Ada");
  });

  it("rejects weak or oversized passwords and bad emails", () => {
    const result = signupSchema.safeParse({
      email: "not-an-email",
      password: "short",
      displayName: "",
    });
    expect(result.success).toBe(false);
    const errors = fieldErrors(result.error!);
    expect(Object.keys(errors).sort()).toEqual(["displayName", "email", "password"]);

    const tooLong = signupSchema.safeParse({
      email: "a@b.co",
      password: "x".repeat(73),
      displayName: "A",
    });
    expect(tooLong.success).toBe(false);
  });
});

describe("cycleSchema", () => {
  it("accepts an ongoing period and normalizes a missing end date to null", () => {
    expect(cycleSchema.parse({ startDate: "2026-10-01" })).toEqual({
      startDate: "2026-10-01",
      endDate: null,
    });
  });

  it("rejects an end date before the start", () => {
    const result = cycleSchema.safeParse({ startDate: "2026-10-05", endDate: "2026-10-01" });
    expect(fieldErrors(result.error!).endDate).toMatch(/on or after/);
  });

  it("rejects implausibly long periods", () => {
    const result = cycleSchema.safeParse({ startDate: "2026-09-01", endDate: "2026-09-20" });
    expect(result.success).toBe(false);
  });

  it("rejects future dates", () => {
    const result = cycleSchema.safeParse({ startDate: addDays(todayISO(), 5) });
    expect(fieldErrors(result.error!).startDate).toMatch(/future/);
  });
});

describe("dailyLogSchema", () => {
  it("defaults symptoms and turns blank notes into null", () => {
    expect(dailyLogSchema.parse({ date: "2026-10-01", mood: "GOOD", notes: "   " })).toEqual({
      date: "2026-10-01",
      mood: "GOOD",
      symptoms: [],
      notes: null,
    });
  });

  it("rejects unknown moods, unknown symptoms, and duplicates", () => {
    expect(dailyLogSchema.safeParse({ date: "2026-10-01", mood: "ECSTATIC" }).success).toBe(false);
    expect(
      dailyLogSchema.safeParse({ date: "2026-10-01", mood: "OKAY", symptoms: ["SNEEZING"] }).success,
    ).toBe(false);
    expect(
      dailyLogSchema.safeParse({ date: "2026-10-01", mood: "OKAY", symptoms: ["ACNE", "ACNE"] })
        .success,
    ).toBe(false);
  });
});

describe("foodSchema and mealEntrySchema", () => {
  const validFood = {
    name: "Overnight oats",
    servingSize: 1,
    servingUnit: "cup",
    ...emptyNutrients(),
    calories: 300,
  };

  it("accepts a complete food", () => {
    expect(foodSchema.parse(validFood).calories).toBe(300);
  });

  it("rejects negative, missing, and absurd nutrient values", () => {
    expect(foodSchema.safeParse({ ...validFood, ironMg: -1 }).success).toBe(false);
    expect(foodSchema.safeParse({ ...validFood, calories: undefined }).success).toBe(false);
    expect(foodSchema.safeParse({ ...validFood, sodiumMg: 1_000_000 }).success).toBe(false);
    expect(foodSchema.safeParse({ ...validFood, calories: "300" }).success).toBe(false);
  });

  it("requires positive servings", () => {
    const entry = { date: "2026-10-01", mealType: "LUNCH", foodId: "abc", servings: 0 };
    expect(mealEntrySchema.safeParse(entry).success).toBe(false);
    expect(mealEntrySchema.safeParse({ ...entry, servings: 1.5 }).success).toBe(true);
  });
});

describe("postSchema and postQuerySchema", () => {
  it("validates tags and limits their number", () => {
    const base = {
      title: "Lentil soup",
      description: "Warm, filling, and iron-rich.",
      ingredients: "lentils\ncarrots",
    };
    expect(postSchema.parse({ ...base, tags: ["IRON_RICH", "VEGAN"] }).instructions).toBeNull();
    expect(postSchema.safeParse({ ...base, tags: ["SPICY"] }).success).toBe(false);
    expect(
      postSchema.safeParse({
        ...base,
        tags: ["IRON_RICH", "VEGAN", "QUICK", "BUDGET", "HIGH_FIBER", "LOW_SUGAR"],
      }).success,
    ).toBe(false);
  });

  it("applies browse defaults", () => {
    expect(postQuerySchema.parse({})).toEqual({ sort: "new", saved: false });
    expect(postQuerySchema.parse({ saved: "1", sort: "popular" }).saved).toBe(true);
    expect(postQuerySchema.safeParse({ sort: "random" }).success).toBe(false);
  });
});
