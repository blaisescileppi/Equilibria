import { cycleSchema } from "@/lib/validation";
import { parseInput, readJson, requireApiUser, route } from "@/server/http";
import { deleteCycle, updateCycle } from "@/server/services/cycles";

type Ctx = RouteContext<"/api/cycles/[id]">;

export const PUT = route<Ctx>(async (req, ctx) => {
  const user = await requireApiUser(req);
  const { id } = await ctx.params;
  const input = parseInput(cycleSchema, await readJson(req));
  return Response.json({ cycle: await updateCycle(user.id, id, input) });
});

export const DELETE = route<Ctx>(async (req, ctx) => {
  const user = await requireApiUser(req);
  const { id } = await ctx.params;
  await deleteCycle(user.id, id);
  return new Response(null, { status: 204 });
});
