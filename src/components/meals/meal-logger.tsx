"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MealType } from "@/generated/prisma/enums";
import { api } from "@/lib/api-client";
import type { ISODate } from "@/lib/dates";
import { MEAL_TYPE_LABELS } from "@/lib/labels";
import { formatAmount } from "@/lib/nutrition";
import { Alert, Button, EmptyState } from "../ui";
import { AddFoodForm, type Food } from "./add-food-form";

type Entry = {
  id: string;
  mealType: MealType;
  servings: number;
  food: Food;
  nutrients: { calories: number; proteinG: number };
};

const MEAL_TYPES = Object.keys(MEAL_TYPE_LABELS) as MealType[];

export function MealLogger({
  date,
  entries,
  recentFoods,
}: {
  date: ISODate;
  entries: Entry[];
  recentFoods: Food[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function changeServings(entry: Entry, servings: number) {
    if (!Number.isFinite(servings) || servings <= 0 || servings === entry.servings) return;
    const result = await api(`/api/meals/${entry.id}`, {
      method: "PUT",
      body: { date, mealType: entry.mealType, foodId: entry.food.id, servings },
    });
    if (!result.ok) return setError(result.fields.servings ?? result.error);
    setError(null);
    router.refresh();
  }

  async function remove(entry: Entry) {
    const result = await api(`/api/meals/${entry.id}`, { method: "DELETE" });
    if (!result.ok) return setError(result.error);
    setError(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error && <Alert>{error}</Alert>}

      <AddFoodForm date={date} recentFoods={recentFoods} onAdded={() => router.refresh()} />

      {entries.length === 0 ? (
        <EmptyState title="Nothing logged for this day">Search for a food above to add it.</EmptyState>
      ) : (
        MEAL_TYPES.map((mealType) => {
          const items = entries.filter((e) => e.mealType === mealType);
          if (items.length === 0) return null;
          const calories = items.reduce((sum, e) => sum + e.nutrients.calories, 0);
          return (
            <section key={mealType}>
              <h3 className="mb-2 flex justify-between text-sm font-semibold text-stone-800">
                {MEAL_TYPE_LABELS[mealType]}
                <span className="font-normal text-stone-500">{formatAmount(calories)} kcal</span>
              </h3>
              <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200">
                {items.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{entry.food.name}</p>
                      <p className="text-xs text-stone-500">
                        {formatAmount(entry.nutrients.calories)} kcal ·{" "}
                        {formatAmount(entry.nutrients.proteinG)} g protein
                      </p>
                    </div>
                    <label className="flex items-center gap-1 text-xs text-stone-600">
                      <input
                        type="number"
                        min={0.25}
                        max={50}
                        step={0.25}
                        defaultValue={entry.servings}
                        aria-label={`Servings of ${entry.food.name}`}
                        onBlur={(e) => changeServings(entry, Number(e.target.value))}
                        className="w-16 rounded-md border border-stone-300 px-2 py-1 text-sm"
                      />
                      × {entry.food.servingSize} {entry.food.servingUnit}
                    </label>
                    <Button variant="ghost" className="px-2 text-red-700" onClick={() => remove(entry)}>
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
