import { describe, expect, it } from "vitest";
import {
  emptyNutrients,
  formatAmount,
  NUTRIENT_KEYS,
  nutrientsOf,
  percentOfReference,
  scaleNutrients,
  sumNutrients,
  totalForEntries,
  type NutrientValues,
} from "./nutrition";

const food = (overrides: Partial<NutrientValues>): NutrientValues => ({
  ...emptyNutrients(),
  ...overrides,
});

describe("nutrient math", () => {
  const oats = food({ calories: 150, proteinG: 5, ironMg: 1.7 });
  const milk = food({ calories: 100, proteinG: 8, calciumMg: 300 });

  it("scales a serving by the number of servings", () => {
    const scaled = scaleNutrients(oats, 1.5);
    expect(scaled.calories).toBe(225);
    expect(scaled.proteinG).toBe(7.5);
    expect(scaled.ironMg).toBeCloseTo(2.55);
  });

  it("sums every nutrient across items", () => {
    const total = sumNutrients([oats, milk]);
    expect(total.calories).toBe(250);
    expect(total.proteinG).toBe(13);
    expect(total.calciumMg).toBe(300);
    expect(total.ironMg).toBe(1.7);
  });

  it("totals logged entries", () => {
    const total = totalForEntries([
      { servings: 2, food: oats },
      { servings: 0.5, food: milk },
    ]);
    expect(total.calories).toBe(350);
    expect(total.calciumMg).toBe(150);
  });

  it("returns zeros for an empty day", () => {
    expect(totalForEntries([])).toEqual(emptyNutrients());
  });

  it("covers every tracked nutrient and nothing else", () => {
    const row = { ...oats, id: "abc", name: "Oats" };
    expect(Object.keys(nutrientsOf(row)).sort()).toEqual([...NUTRIENT_KEYS].sort());
  });
});

describe("display helpers", () => {
  it("computes percent of a reference value", () => {
    expect(percentOfReference(9, 18)).toBe(50);
    expect(percentOfReference(0, 18)).toBe(0);
  });

  it("rounds sensibly by magnitude", () => {
    expect(formatAmount(1234.6)).toBe("1,235");
    expect(formatAmount(45.4)).toBe("45");
    expect(formatAmount(2.44)).toBe("2.4");
    expect(formatAmount(3)).toBe("3");
  });
});
