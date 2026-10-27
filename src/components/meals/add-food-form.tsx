"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { MealType } from "@/generated/prisma/enums";
import { api } from "@/lib/api-client";
import type { ISODate } from "@/lib/dates";
import { MEAL_TYPE_LABELS } from "@/lib/labels";
import { formatAmount } from "@/lib/nutrition";
import { fieldErrors, mealEntrySchema } from "@/lib/validation";
import { Alert, Button, cn } from "../ui";

export type Food = {
  id: string;
  name: string;
  servingSize: number;
  servingUnit: string;
  isCustom: boolean;
  nutrients: { calories: number; proteinG: number };
};

/** Guess the meal from the time of day so the common case needs no click. */
function defaultMealType(): MealType {
  const hour = new Date().getHours();
  if (hour < 11) return "BREAKFAST";
  if (hour < 15) return "LUNCH";
  if (hour < 21) return "DINNER";
  return "SNACK";
}

export function AddFoodForm({
  date,
  recentFoods,
  onAdded,
}: {
  date: ISODate;
  recentFoods: Food[];
  onAdded: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [selected, setSelected] = useState<Food | null>(null);
  const [mealType, setMealType] = useState<MealType>("BREAKFAST");
  const [servings, setServings] = useState("1");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  // Debounced search: wait until typing pauses, and ignore responses for a
  // query the user has already changed.
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    let stale = false;
    const timer = setTimeout(async () => {
      const result = await api<{ foods: Food[] }>(`/api/foods?q=${encodeURIComponent(q)}`);
      if (!stale && result.ok) setResults(result.data.foods);
    }, 250);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [query]);

  const shown = query.trim() ? results : recentFoods;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = mealEntrySchema.safeParse({
      date,
      mealType,
      foodId: selected?.id ?? "",
      servings: Number(servings),
    });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));

    setPending(true);
    const result = await api("/api/meals", { method: "POST", body: parsed.data });
    setPending(false);
    if (!result.ok) return setErrors({ ...result.fields, _form: result.error });

    setErrors({});
    setSelected(null);
    setQuery("");
    setServings("1");
    onAdded();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3 rounded-xl bg-stone-50 p-4">
      {errors._form && <Alert>{errors._form}</Alert>}

      {selected ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-stone-500">Adding</p>
            <p className="font-medium">{selected.name}</p>
            <p className="text-xs text-stone-500">
              {formatAmount(selected.nutrients.calories)} kcal per {selected.servingSize}{" "}
              {selected.servingUnit}
            </p>
          </div>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-stone-600">Servings</span>
            <input
              type="number"
              min={0.25}
              step={0.25}
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              aria-invalid={Boolean(errors.servings)}
              className="w-20 rounded-lg border border-stone-300 bg-white px-2 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-stone-600">Meal</span>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealType)}
              className="rounded-lg border border-stone-300 bg-white px-2 py-2"
            >
              {(Object.keys(MEAL_TYPE_LABELS) as MealType[]).map((type) => (
                <option key={type} value={type}>
                  {MEAL_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setSelected(null)}>
              Cancel
            </Button>
          </div>
          {errors.servings && <p className="w-full text-xs text-red-700">{errors.servings}</p>}
        </div>
      ) : (
        <>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Add a food</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search foods, e.g. lentils"
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          {errors.foodId && <p className="text-xs text-red-700">Pick a food from the list.</p>}
          {shown.length > 0 && (
            <div>
              {!query.trim() && <p className="mb-1 text-xs text-stone-500">Recently logged</p>}
              <ul className="max-h-64 overflow-y-auto rounded-lg border border-stone-200 bg-white">
                {shown.map((food) => (
                  <li key={food.id}>
                    <button
                      type="button"
                      onClick={() => {
                        // Chosen on click (in the browser), not during render,
                        // so server and client HTML can't disagree.
                        setMealType(defaultMealType());
                        setSelected(food);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-brand-soft",
                      )}
                    >
                      <span className="min-w-0 truncate">
                        {food.name}
                        {food.isCustom && <span className="ml-2 text-xs text-brand">mine</span>}
                      </span>
                      <span className="shrink-0 text-xs text-stone-500">
                        {formatAmount(food.nutrients.calories)} kcal / {food.servingSize} {food.servingUnit}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {query.trim() && results.length === 0 && (
            <p className="text-sm text-stone-600">
              No matches.{" "}
              <Link href="/meals/foods" className="text-brand underline">
                Add your own food
              </Link>
              .
            </p>
          )}
        </>
      )}
    </form>
  );
}
