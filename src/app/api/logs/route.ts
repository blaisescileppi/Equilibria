import { monthOf, todayISO } from "@/lib/dates";
import { dailyLogSchema, monthQuerySchema } from "@/lib/validation";
import {
  parseInput,
  readJson,
  requireApiUser,
  route,
  searchParamsObject,
} from "@/server/http";
import { createLog, listLogsForMonth } from "@/server/services/daily-logs";

/** GET /api/logs?month=2026-10 (defaults to the current month) */
export const GET = route(async (req) => {
  const user = await requireApiUser(req);
  const { month = monthOf(todayISO()) } = parseInput(monthQuerySchema, searchParamsObject(req));
  return Response.json({ month, logs: await listLogsForMonth(user.id, month) });
});

export const POST = route(async (req) => {
  const user = await requireApiUser(req);
  const input = parseInput(dailyLogSchema, await readJson(req));
  return Response.json({ log: await createLog(user.id, input) }, { status: 201 });
});
