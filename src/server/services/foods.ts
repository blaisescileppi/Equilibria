import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { nutrientsOf, type NutrientValues } from "@/lib/nutrition";
import type { FoodInput } from "@/lib/validation";
import { conflict, notFound } from "../http";

export type FoodDTO = {
  id: string;
  name: string;
  servingSize: number;
  servingUnit: string;
  isCustom: boolean;
  nutrients: NutrientValues;
};

type FoodRow = NutrientValues & {
  id: string;
  name: string;
  servingSize: number;
  servingUnit: string;
  createdById: string | null;
};

export function toFoodDTO(row: FoodRow): FoodDTO {
  return {
    id: row.id,
    name: row.name,
    servingSize: row.servingSize,
    servingUnit: row.servingUnit,
    isCustom: row.createdById !== null,
    nutrients: nutrientsOf(row),
  };
}

/** Library foods (no owner) plus the user's own custom foods. Nobody else's. */
export function visibleTo(userId: string): Prisma.FoodWhereInput {
  return { OR: [{ createdById: null }, { createdById: userId }] };
}

export async function searchFoods(userId: string, query: string, take = 25): Promise<FoodDTO[]> {
  const rows = await prisma.food.findMany({
    where: {
      AND: [visibleTo(userId), query ? { name: { contains: query, mode: "insensitive" } } : {}],
    },
    // Custom foods first: if you made it, you probably want it.
    orderBy: [{ createdById: { sort: "asc", nulls: "last" } }, { name: "asc" }],
    take,
  });
  return rows.map(toFoodDTO);
}

export async function listCustomFoods(userId: string) {
  const rows = await prisma.food.findMany({
    where: { createdById: userId },
    orderBy: { name: "asc" },
    include: { _count: { select: { entries: true } } },
  });
  return rows.map((row) => ({ ...toFoodDTO(row), timesLogged: row._count.entries }));
}

/** Foods the user logged most recently, for one-tap re-logging. */
export async function recentFoods(userId: string, take = 8): Promise<FoodDTO[]> {
  const entries = await prisma.mealEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    distinct: ["foodId"],
    take,
    include: { food: true },
  });
  return entries.map((e) => toFoodDTO(e.food));
}

export async function createFood(userId: string, input: FoodInput): Promise<FoodDTO> {
  return toFoodDTO(await prisma.food.create({ data: { ...input, createdById: userId } }));
}

export async function deleteFood(userId: string, id: string): Promise<void> {
  // Only custom foods can be deleted, and only by their owner.
  const food = await prisma.food.findFirst({
    where: { id, createdById: userId },
    include: { _count: { select: { entries: true } } },
  });
  if (!food) throw notFound("Food not found.");
  if (food._count.entries > 0) {
    throw conflict(
      `This food is used in ${food._count.entries} logged meal${food._count.entries > 1 ? "s" : ""}. Remove those first.`,
    );
  }
  // If an entry is added between the check and the delete, the foreign key
  // rejects the delete (P2003) and the route reports it as a 409.
  await prisma.food.delete({ where: { id } });
}
