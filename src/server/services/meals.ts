import "server-only";
import type { MealType } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { daysBetween, toDate, toISODate, type ISODate } from "@/lib/dates";
import {
  emptyNutrients,
  NUTRIENT_KEYS,
  nutrientsOf,
  scaleNutrients,
  sumNutrients,
  totalForEntries,
  type NutrientValues,
} from "@/lib/nutrition";
import type { MealEntryInput } from "@/lib/validation";
import { notFound } from "../http";
import { toFoodDTO, visibleTo, type FoodDTO } from "./foods";

export type MealEntryDTO = {
  id: string;
  date: ISODate;
  mealType: MealType;
  servings: number;
  food: FoodDTO;
  nutrients: NutrientValues; // food values x servings
};

type EntryRow = Awaited<ReturnType<typeof findEntries>>[number];

function findEntries(userId: string, from: ISODate, to: ISODate) {
  return prisma.mealEntry.findMany({
    where: { userId, date: { gte: toDate(from), lte: toDate(to) } },
    include: { food: true },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
}

function toDTO(row: EntryRow): MealEntryDTO {
  const food = toFoodDTO(row.food);
  return {
    id: row.id,
    date: toISODate(row.date),
    mealType: row.mealType,
    servings: row.servings,
    food,
    nutrients: scaleNutrients(food.nutrients, row.servings),
  };
}

export async function listEntriesForDate(userId: string, date: ISODate) {
  return (await findEntries(userId, date, date)).map(toDTO);
}

export async function getDayTotals(userId: string, date: ISODate): Promise<NutrientValues> {
  const rows = await findEntries(userId, date, date);
  return totalForEntries(rows.map((r) => ({ servings: r.servings, food: nutrientsOf(r.food) })));
}

/**
 * Average intake per day over the days in a range that have any entries.
 * Days with nothing logged are skipped so a forgotten day doesn't look like fasting.
 */
export async function averageDailyIntake(userId: string, from: ISODate, to: ISODate) {
  const rows = await findEntries(userId, from, to);
  const byDay = new Map<ISODate, NutrientValues[]>();
  for (const row of rows) {
    const day = toISODate(row.date);
    const list = byDay.get(day) ?? [];
    list.push(scaleNutrients(nutrientsOf(row.food), row.servings));
    byDay.set(day, list);
  }
  const dayTotals = [...byDay.values()].map(sumNutrients);
  const total = sumNutrients(dayTotals);
  const average = emptyNutrients();
  for (const key of NUTRIENT_KEYS) {
    average[key] = dayTotals.length ? total[key] / dayTotals.length : 0;
  }
  return { daysLogged: dayTotals.length, daysInRange: daysBetween(from, to) + 1, average };
}

/** The food must be in the shared library or belong to this user. */
async function assertFoodVisible(userId: string, foodId: string) {
  const food = await prisma.food.findFirst({ where: { id: foodId, ...visibleTo(userId) } });
  if (!food) throw notFound("Food not found.");
}

export async function createEntry(userId: string, input: MealEntryInput) {
  await assertFoodVisible(userId, input.foodId);
  const row = await prisma.mealEntry.create({
    data: { ...input, userId, date: toDate(input.date) },
    include: { food: true },
  });
  return toDTO(row);
}

export async function updateEntry(userId: string, id: string, input: MealEntryInput) {
  const existing = await prisma.mealEntry.findFirst({ where: { id, userId } });
  if (!existing) throw notFound("Meal entry not found.");
  await assertFoodVisible(userId, input.foodId);
  const row = await prisma.mealEntry.update({
    where: { id },
    data: { ...input, date: toDate(input.date) },
    include: { food: true },
  });
  return toDTO(row);
}

export async function deleteEntry(userId: string, id: string) {
  const { count } = await prisma.mealEntry.deleteMany({ where: { id, userId } });
  if (count === 0) throw notFound("Meal entry not found.");
}
