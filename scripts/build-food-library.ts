// Builds prisma/data/foods.json from USDA FoodData Central SR Legacy CSVs.
//
// Usage:
//   1. Download and unzip the SR Legacy CSV release (about 6 MB):
//      https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip
//   2. npx tsx scripts/build-food-library.ts path/to/FoodData_Central_sr_legacy_food_csv_2018-04
//
// USDA reports nutrients per 100 g; this converts them to the serving sizes
// chosen in usda-food-selection.ts. The output is committed, so the app and
// seed script never need the raw download.

import { createReadStream, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { NUTRIENT_KEYS, type NutrientKey } from "../src/lib/nutrition";
import { FOOD_SELECTION } from "./usda-food-selection";

// USDA nutrient ids for each tracked nutrient, in order of preference.
// Folate uses DFE (dietary folate equivalents) because the 400 mcg
// reference value is expressed in DFE.
const USDA_NUTRIENT_IDS: Record<NutrientKey, number[]> = {
  calories: [1008],
  proteinG: [1003],
  carbsG: [1005],
  fatG: [1004],
  fiberG: [1079],
  sugarG: [2000],
  ironMg: [1089],
  calciumMg: [1087],
  folateMcg: [1190, 1177],
  vitaminDMcg: [1114],
  vitaminB12Mcg: [1178],
  magnesiumMg: [1090],
  zincMg: [1095],
  potassiumMg: [1092],
  sodiumMg: [1093],
  vitaminCMg: [1162],
};

/** Splits one CSV line, honouring quoted fields and "" escapes. */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

async function main() {
  const dir = process.argv[2];
  if (!dir || !existsSync(path.join(dir, "food_nutrient.csv"))) {
    console.error("Pass the unzipped SR Legacy folder. See the comment at the top of this file.");
    process.exit(1);
  }

  const wanted = new Set(FOOD_SELECTION.map((f) => String(f.fdcId)));

  // Confirm every selected id exists, so a typo fails loudly.
  const descriptions = new Map<string, string>();
  for (const line of readFileSync(path.join(dir, "food.csv"), "utf8").split("\n").slice(1)) {
    const [fdcId, , description] = parseCsvLine(line);
    if (wanted.has(fdcId)) descriptions.set(fdcId, description);
  }
  const missingFoods = [...wanted].filter((id) => !descriptions.has(id));
  if (missingFoods.length) throw new Error(`Unknown FDC ids: ${missingFoods.join(", ")}`);

  // food_nutrient.csv has ~640k rows, so stream it instead of loading it all.
  const per100g = new Map<string, Map<number, number>>();
  const rl = createInterface({ input: createReadStream(path.join(dir, "food_nutrient.csv")) });
  let header = true;
  for await (const line of rl) {
    if (header) {
      header = false;
      continue;
    }
    const [, fdcId, nutrientId, amount] = parseCsvLine(line);
    if (!wanted.has(fdcId)) continue;
    if (!per100g.has(fdcId)) per100g.set(fdcId, new Map());
    per100g.get(fdcId)!.set(Number(nutrientId), Number(amount));
  }

  const gaps: string[] = [];
  const foods = FOOD_SELECTION.map((selection) => {
    const values = per100g.get(String(selection.fdcId)) ?? new Map<number, number>();
    const factor = selection.grams / 100;
    const nutrients = Object.fromEntries(
      NUTRIENT_KEYS.map((key) => {
        const id = USDA_NUTRIENT_IDS[key].find((candidate) => values.has(candidate));
        if (id === undefined) {
          // USDA didn't measure it. 0 under-counts slightly; it's reported below.
          gaps.push(`${selection.name}: ${key}`);
          return [key, 0];
        }
        return [key, Math.round(values.get(id)! * factor * 100) / 100];
      }),
    );
    return {
      usdaFdcId: selection.fdcId,
      usdaDescription: descriptions.get(String(selection.fdcId)),
      name: selection.name,
      servingSize: selection.servingSize,
      servingUnit: selection.servingUnit,
      servingGrams: selection.grams,
      ...nutrients,
    };
  });

  const output = {
    source:
      "U.S. Department of Agriculture, Agricultural Research Service. FoodData Central: SR Legacy (April 2018). fdc.nal.usda.gov. Public domain.",
    generatedBy: "scripts/build-food-library.ts",
    missingValuesRecordedAsZero: gaps,
    foods,
  };
  const outPath = path.join(import.meta.dirname, "../prisma/data/foods.json");
  writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${foods.length} foods to ${path.relative(process.cwd(), outPath)}.`);
  if (gaps.length) console.log(`${gaps.length} nutrient values were missing in USDA data and set to 0.`);
}

main();
