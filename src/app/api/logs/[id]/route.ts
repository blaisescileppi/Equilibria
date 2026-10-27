import { dailyLogSchema } from "@/lib/validation";
import { parseInput, readJson, requireApiUser, route } from "@/server/http";
import { deleteLog, updateLog } from "@/server/services/daily-logs";

type Ctx = RouteContext<"/api/logs/[id]">;

export const PUT = route<Ctx>(async (req, ctx) => {
  const user = await requireApiUser(req);
  const { id } = await ctx.params;
  const input = parseInput(dailyLogSchema, await readJson(req));
  return Response.json({ log: await updateLog(user.id, id, input) });
});

export const DELETE = route<Ctx>(async (req, ctx) => {
  const user = await requireApiUser(req);
  const { id } = await ctx.params;
  await deleteLog(user.id, id);
  return new Response(null, { status: 204 });
});
