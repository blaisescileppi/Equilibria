import {
  formatAmount,
  NUTRIENTS,
  percentOfReference,
  type Nutrient,
  type NutrientValues,
} from "@/lib/nutrition";
import { Card, cn } from "../ui";

// Read-only, so it stays a Server Component and ships no JavaScript.
export function NutritionPanel({ totals, title = "Daily totals" }: { totals: NutrientValues; title?: string }) {
  const energy = NUTRIENTS.find((n) => n.key === "calories")!;
  const macros = NUTRIENTS.filter((n) => n.group === "macro");
  const micros = NUTRIENTS.filter((n) => n.group === "micro");

  return (
    <Card className="h-fit space-y-5">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-2 text-3xl font-semibold text-brand-ink">
          {formatAmount(totals.calories)}{" "}
          <span className="text-base font-normal text-stone-600">
            / {energy.reference.toLocaleString()} kcal
          </span>
        </p>
      </div>
      <NutrientBars title="Macronutrients" nutrients={macros} totals={totals} />
      <NutrientBars title="Micronutrients" nutrients={micros} totals={totals} />
      <p className="text-xs text-stone-500">
        Reference values are NIH/FDA daily amounts for non-pregnant women aged 19-50. Sodium and
        sugars are limits, not targets. Your needs may differ.
      </p>
    </Card>
  );
}

function NutrientBars({
  title,
  nutrients,
  totals,
}: {
  title: string;
  nutrients: readonly Nutrient[];
  totals: NutrientValues;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">{title}</h3>
      <ul className="space-y-2">
        {nutrients.map((nutrient) => {
          const value = totals[nutrient.key];
          const percent = percentOfReference(value, nutrient.reference);
          const overLimit = nutrient.kind === "limit" && percent > 100;
          return (
            <li key={nutrient.key}>
              <div className="flex justify-between text-sm">
                <span>
                  {nutrient.label}
                  {nutrient.kind === "limit" && <span className="text-stone-500"> (limit)</span>}
                </span>
                <span className={cn("tabular-nums", overLimit ? "text-red-700" : "text-stone-600")}>
                  {formatAmount(value)} / {formatAmount(nutrient.reference)} {nutrient.unit}
                </span>
              </div>
              <div
                className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100"
                role="progressbar"
                aria-label={`${nutrient.label}: ${percent}% of daily reference`}
                aria-valuenow={Math.min(percent, 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={cn(
                    "h-full rounded-full",
                    overLimit ? "bg-red-500" : nutrient.kind === "limit" ? "bg-stone-400" : "bg-sage",
                  )}
                  style={{ width: `${Math.min(percent, 100)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
