import { mealEntrySchema } from "@/lib/validation";
import { parseInput, readJson, requireApiUser, route } from "@/server/http";
import { deleteEntry, updateEntry } from "@/server/services/meals";

type Ctx = RouteContext<"/api/meals/[id]">;

export const PUT = route<Ctx>(async (req, ctx) => {
  const user = await requireApiUser(req);
  const { id } = await ctx.params;
  const input = parseInput(mealEntrySchema, await readJson(req));
  return Response.json({ entry: await updateEntry(user.id, id, input) });
});

export const DELETE = route<Ctx>(async (req, ctx) => {
  const user = await requireApiUser(req);
  const { id } = await ctx.params;
  await deleteEntry(user.id, id);
  return new Response(null, { status: 204 });
});
