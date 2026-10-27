import { dayQuerySchema, mealEntrySchema } from "@/lib/validation";
import {
  parseInput,
  readJson,
  requestToday,
  requireApiUser,
  route,
  searchParamsObject,
} from "@/server/http";
import { createEntry, getDayTotals, listEntriesForDate } from "@/server/services/meals";

/** GET /api/meals?date=2026-10-27 returns that day's entries and totals. */
export const GET = route(async (req) => {
  const user = await requireApiUser(req);
  const { date = requestToday(req) } = parseInput(dayQuerySchema, searchParamsObject(req));
  const [entries, totals] = await Promise.all([
    listEntriesForDate(user.id, date),
    getDayTotals(user.id, date),
  ]);
  return Response.json({ date, entries, totals });
});

export const POST = route(async (req) => {
  const user = await requireApiUser(req);
  const input = parseInput(mealEntrySchema, await readJson(req));
  return Response.json({ entry: await createEntry(user.id, input) }, { status: 201 });
});
