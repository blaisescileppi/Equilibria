import { beforeEach, describe, expect, it } from "vitest";
import { DELETE as deleteFood } from "@/app/api/foods/[id]/route";
import { GET as searchFoods, POST as createFood } from "@/app/api/foods/route";
import { DELETE as deleteEntry, PUT as updateEntry } from "@/app/api/meals/[id]/route";
import { GET as getMeals, POST as addEntry } from "@/app/api/meals/route";
import { prisma } from "@/lib/db";
import { emptyNutrients } from "@/lib/nutrition";
import { createUser, json, makeRequest, params, resetDb } from "../helpers";

beforeEach(resetDb);

const nutrients = (overrides: Partial<ReturnType<typeof emptyNutrients>>) => ({
  ...emptyNutrients(),
  ...overrides,
});

async function libraryFood(name: string, values: Partial<ReturnType<typeof emptyNutrients>>) {
  return prisma.food.create({
    data: { name, servingSize: 1, servingUnit: "cup", ...nutrients(values) },
  });
}

type FoodBody = { food: { id: string; isCustom: boolean } };
type EntryBody = { entry: { id: string; nutrients: { calories: number } } };

describe("/api/foods", () => {
  it("searches the library and the user's own foods, but not other users'", async () => {
    const me = await createUser();
    const other = await createUser();
    await libraryFood("Rolled oats", { calories: 150 });
    await createFood(
      makeRequest("/api/foods", {
        method: "POST",
        token: me.token,
        body: { name: "My oat bars", servingSize: 1, servingUnit: "bar", ...nutrients({ calories: 200 }) },
      }),
      {},
    );
    await createFood(
      makeRequest("/api/foods", {
        method: "POST",
        token: other.token,
        body: { name: "Secret oat recipe", servingSize: 1, servingUnit: "bowl", ...nutrients({}) },
      }),
      {},
    );

    const res = await searchFoods(makeRequest("/api/foods?q=OAT", { token: me.token }), {});
    const { foods } = await json<{ foods: { name: string; isCustom: boolean }[] }>(res);
    expect(foods.map((f) => f.name)).toEqual(["My oat bars", "Rolled oats"]);
    expect(foods[0].isCustom).toBe(true);
  });

  it("validates custom foods", async () => {
    const { token } = await createUser();
    const res = await createFood(
      makeRequest("/api/foods", {
        method: "POST",
        token,
        body: { name: "x", servingSize: 0, servingUnit: "", calories: -5 },
      }),
      {},
    );
    expect(res.status).toBe(400);
    const { fields } = await json<{ fields: Record<string, string> }>(res);
    expect(fields).toHaveProperty("name");
    expect(fields).toHaveProperty("servingSize");
    expect(fields).toHaveProperty("calories");
    expect(fields).toHaveProperty("ironMg"); // missing nutrients are errors, not silent zeros
  });

  it("won't delete a food that logged meals still use", async () => {
    const { token } = await createUser();
    const { food } = await json<FoodBody>(
      await createFood(
        makeRequest("/api/foods", {
          method: "POST",
          token,
          body: { name: "Smoothie", servingSize: 1, servingUnit: "glass", ...nutrients({ calories: 250 }) },
        }),
        {},
      ),
    );
    await addEntry(
      makeRequest("/api/meals", {
        method: "POST",
        token,
        body: { date: "2026-10-01", mealType: "BREAKFAST", foodId: food.id, servings: 1 },
      }),
      {},
    );

    const res = await deleteFood(makeRequest(`/api/foods/${food.id}`, { method: "DELETE", token }), params({ id: food.id }));
    expect(res.status).toBe(409);
    expect(await prisma.food.count()).toBe(1);
  });

  it("can't delete library foods", async () => {
    const { token } = await createUser();
    const oats = await libraryFood("Oats", {});
    const res = await deleteFood(makeRequest(`/api/foods/${oats.id}`, { method: "DELETE", token }), params({ id: oats.id }));
    expect(res.status).toBe(404);
  });
});

describe("/api/meals", () => {
  it("logs entries and totals the day's nutrients", async () => {
    const { token } = await createUser();
    const oats = await libraryFood("Oats", { calories: 150, proteinG: 5, ironMg: 2 });
    const milk = await libraryFood("Milk", { calories: 120, proteinG: 8, calciumMg: 300 });

    const first = await addEntry(
      makeRequest("/api/meals", {
        method: "POST",
        token,
        body: { date: "2026-10-01", mealType: "BREAKFAST", foodId: oats.id, servings: 2 },
      }),
      {},
    );
    expect(first.status).toBe(201);
    expect((await json<EntryBody>(first)).entry.nutrients.calories).toBe(300);

    await addEntry(
      makeRequest("/api/meals", {
        method: "POST",
        token,
        body: { date: "2026-10-01", mealType: "BREAKFAST", foodId: milk.id, servings: 0.5 },
      }),
      {},
    );
    await addEntry(
      makeRequest("/api/meals", {
        method: "POST",
        token,
        body: { date: "2026-10-02", mealType: "LUNCH", foodId: milk.id, servings: 1 },
      }),
      {},
    );

    const res = await getMeals(makeRequest("/api/meals?date=2026-10-01", { token }), {});
    const body = await json<{ entries: unknown[]; totals: Record<string, number> }>(res);
    expect(body.entries).toHaveLength(2);
    expect(body.totals).toMatchObject({ calories: 360, proteinG: 14, ironMg: 4, calciumMg: 150 });
  });

  it("rejects another user's private food", async () => {
    const me = await createUser();
    const other = await createUser();
    const { food } = await json<FoodBody>(
      await createFood(
        makeRequest("/api/foods", {
          method: "POST",
          token: other.token,
          body: { name: "Their soup", servingSize: 1, servingUnit: "bowl", ...nutrients({}) },
        }),
        {},
      ),
    );
    const res = await addEntry(
      makeRequest("/api/meals", {
        method: "POST",
        token: me.token,
        body: { date: "2026-10-01", mealType: "LUNCH", foodId: food.id, servings: 1 },
      }),
      {},
    );
    expect(res.status).toBe(404);
  });

  it("edits servings and deletes entries, only for the owner", async () => {
    const me = await createUser();
    const other = await createUser();
    const oats = await libraryFood("Oats", { calories: 150 });
    const { entry } = await json<EntryBody>(
      await addEntry(
        makeRequest("/api/meals", {
          method: "POST",
          token: me.token,
          body: { date: "2026-10-01", mealType: "BREAKFAST", foodId: oats.id, servings: 1 },
        }),
        {},
      ),
    );

    const body = { date: "2026-10-01", mealType: "SNACK", foodId: oats.id, servings: 3 };
    const forbidden = await updateEntry(
      makeRequest(`/api/meals/${entry.id}`, { method: "PUT", token: other.token, body }),
      params({ id: entry.id }),
    );
    expect(forbidden.status).toBe(404);

    const updated = await updateEntry(
      makeRequest(`/api/meals/${entry.id}`, { method: "PUT", token: me.token, body }),
      params({ id: entry.id }),
    );
    expect((await json<EntryBody>(updated)).entry.nutrients.calories).toBe(450);

    const deleted = await deleteEntry(
      makeRequest(`/api/meals/${entry.id}`, { method: "DELETE", token: me.token }),
      params({ id: entry.id }),
    );
    expect(deleted.status).toBe(204);
    expect(await prisma.mealEntry.count()).toBe(0);
  });
});

describe("account deletion", () => {
  it("cascades through all of a user's data, including foods used by their entries", async () => {
    const { user, token } = await createUser();
    const { food } = await json<FoodBody>(
      await createFood(
        makeRequest("/api/foods", {
          method: "POST",
          token,
          body: { name: "Smoothie", servingSize: 1, servingUnit: "glass", ...nutrients({}) },
        }),
        {},
      ),
    );
    await addEntry(
      makeRequest("/api/meals", {
        method: "POST",
        token,
        body: { date: "2026-10-01", mealType: "BREAKFAST", foodId: food.id, servings: 1 },
      }),
      {},
    );

    await prisma.user.delete({ where: { id: user.id } });
    expect(await prisma.food.count()).toBe(0);
    expect(await prisma.mealEntry.count()).toBe(0);
    expect(await prisma.session.count()).toBe(0);
  });
});
