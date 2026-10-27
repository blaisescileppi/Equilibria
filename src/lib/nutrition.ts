// Nutrient definitions and pure math for meal tracking.
//
// Reference values are for non-pregnant women aged 19-50, from the NIH
// Office of Dietary Supplements (RDA/AI) and FDA Daily Values. "limit"
// means stay under it (sodium, sugar); "goal" means aim to reach it.

export const NUTRIENTS = [
  { key: "calories", label: "Calories", unit: "kcal", reference: 2000, kind: "goal", group: "energy" },
  { key: "proteinG", label: "Protein", unit: "g", reference: 46, kind: "goal", group: "macro" },
  { key: "carbsG", label: "Carbohydrates", unit: "g", reference: 130, kind: "goal", group: "macro" },
  { key: "fatG", label: "Fat", unit: "g", reference: 78, kind: "goal", group: "macro" },
  { key: "fiberG", label: "Fiber", unit: "g", reference: 25, kind: "goal", group: "macro" },
  { key: "sugarG", label: "Sugars", unit: "g", reference: 50, kind: "limit", group: "macro" },
  { key: "ironMg", label: "Iron", unit: "mg", reference: 18, kind: "goal", group: "micro" },
  { key: "calciumMg", label: "Calcium", unit: "mg", reference: 1000, kind: "goal", group: "micro" },
  { key: "folateMcg", label: "Folate", unit: "mcg", reference: 400, kind: "goal", group: "micro" },
  { key: "vitaminDMcg", label: "Vitamin D", unit: "mcg", reference: 15, kind: "goal", group: "micro" },
  { key: "vitaminB12Mcg", label: "Vitamin B12", unit: "mcg", reference: 2.4, kind: "goal", group: "micro" },
  { key: "magnesiumMg", label: "Magnesium", unit: "mg", reference: 310, kind: "goal", group: "micro" },
  { key: "zincMg", label: "Zinc", unit: "mg", reference: 8, kind: "goal", group: "micro" },
  { key: "potassiumMg", label: "Potassium", unit: "mg", reference: 2600, kind: "goal", group: "micro" },
  { key: "sodiumMg", label: "Sodium", unit: "mg", reference: 2300, kind: "limit", group: "micro" },
  { key: "vitaminCMg", label: "Vitamin C", unit: "mg", reference: 75, kind: "goal", group: "micro" },
] as const;

export type Nutrient = (typeof NUTRIENTS)[number];
export type NutrientKey = Nutrient["key"];
export type NutrientValues = Record<NutrientKey, number>;

export const NUTRIENT_KEYS = NUTRIENTS.map((n) => n.key) as NutrientKey[];

export function emptyNutrients(): NutrientValues {
  return Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, 0])) as NutrientValues;
}

/** Pick only the nutrient fields from a larger object (e.g. a Food row). */
export function nutrientsOf(source: NutrientValues): NutrientValues {
  return Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, source[k]])) as NutrientValues;
}

export function scaleNutrients(perServing: NutrientValues, servings: number): NutrientValues {
  return Object.fromEntries(
    NUTRIENT_KEYS.map((k) => [k, perServing[k] * servings]),
  ) as NutrientValues;
}

export function sumNutrients(items: NutrientValues[]): NutrientValues {
  const total = emptyNutrients();
  for (const item of items) {
    for (const k of NUTRIENT_KEYS) total[k] += item[k];
  }
  return total;
}

/** Totals for a list of logged entries: each food's values times its servings. */
export function totalForEntries(
  entries: { servings: number; food: NutrientValues }[],
): NutrientValues {
  return sumNutrients(entries.map((e) => scaleNutrients(e.food, e.servings)));
}

export function percentOfReference(value: number, reference: number): number {
  return Math.round((value / reference) * 100);
}

/** Display rounding: whole numbers for big values, one decimal for small ones. */
export function formatAmount(value: number): string {
  if (value >= 100) return Math.round(value).toLocaleString("en-US");
  if (value >= 10) return value.toFixed(0);
  return value.toFixed(1).replace(/\.0$/, "");
}
