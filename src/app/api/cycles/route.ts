import { todayISO } from "@/lib/dates";
import { cycleSchema } from "@/lib/validation";
import { parseInput, readJson, requireApiUser, route } from "@/server/http";
import { createCycle, getCycleInsights, listCycles } from "@/server/services/cycles";

// Route Handlers stay thin: authenticate, validate, call a service, respond.

export const GET = route(async (req) => {
  const user = await requireApiUser(req);
  const [cycles, insights] = await Promise.all([
    listCycles(user.id),
    getCycleInsights(user.id, todayISO()),
  ]);
  return Response.json({ cycles, insights });
});

export const POST = route(async (req) => {
  const user = await requireApiUser(req);
  const input = parseInput(cycleSchema, await readJson(req));
  return Response.json({ cycle: await createCycle(user.id, input) }, { status: 201 });
});
