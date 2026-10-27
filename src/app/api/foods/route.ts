import { foodSchema, foodSearchSchema } from "@/lib/validation";
import {
  parseInput,
  readJson,
  requireApiUser,
  route,
  searchParamsObject,
} from "@/server/http";
import { createFood, searchFoods } from "@/server/services/foods";

/** GET /api/foods?q=oat searches the library and the user's custom foods. */
export const GET = route(async (req) => {
  const user = await requireApiUser(req);
  const { q } = parseInput(foodSearchSchema, searchParamsObject(req));
  return Response.json({ foods: await searchFoods(user.id, q) });
});

export const POST = route(async (req) => {
  const user = await requireApiUser(req);
  const input = parseInput(foodSchema, await readJson(req));
  return Response.json({ food: await createFood(user.id, input) }, { status: 201 });
});
