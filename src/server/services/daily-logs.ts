import "server-only";
import { Prisma, type Mood, type Symptom } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { addDays, addMonths, toDate, toISODate, type ISODate } from "@/lib/dates";
import type { DailyLogInput } from "@/lib/validation";
import { conflict, notFound } from "../http";

export type DailyLogDTO = {
  id: string;
  date: ISODate;
  mood: Mood;
  symptoms: Symptom[];
  notes: string | null;
};

function toDTO(row: {
  id: string;
  date: Date;
  mood: Mood;
  symptoms: Symptom[];
  notes: string | null;
}): DailyLogDTO {
  return {
    id: row.id,
    date: toISODate(row.date),
    mood: row.mood,
    symptoms: row.symptoms,
    notes: row.notes,
  };
}

/** Logs between two dates, inclusive, oldest first. */
export async function listLogsBetween(userId: string, from: ISODate, to: ISODate) {
  const rows = await prisma.dailyLog.findMany({
    where: { userId, date: { gte: toDate(from), lte: toDate(to) } },
    orderBy: { date: "asc" },
  });
  return rows.map(toDTO);
}

export function listLogsForMonth(userId: string, month: string) {
  const first = `${month}-01`;
  const last = addDays(`${addMonths(month, 1)}-01`, -1);
  return listLogsBetween(userId, first, last);
}

export async function listRecentLogs(userId: string, take = 14) {
  const rows = await prisma.dailyLog.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take,
  });
  return rows.map(toDTO);
}

export async function getLogForDate(userId: string, date: ISODate) {
  const row = await prisma.dailyLog.findUnique({
    where: { userId_date: { userId, date: toDate(date) } },
  });
  return row ? toDTO(row) : null;
}

function data(input: DailyLogInput) {
  return {
    date: toDate(input.date),
    mood: input.mood,
    symptoms: input.symptoms,
    notes: input.notes,
  };
}

// The (userId, date) unique index enforces "one log per day". Catching its
// violation is race-free, unlike checking first and inserting second.
function duplicateDay(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw conflict("You already have a log for this day. Edit that one instead.", {
      date: "A log for this day already exists.",
    });
  }
  throw error;
}

export async function createLog(userId: string, input: DailyLogInput) {
  try {
    return toDTO(await prisma.dailyLog.create({ data: { userId, ...data(input) } }));
  } catch (error) {
    duplicateDay(error);
  }
}

export async function updateLog(userId: string, id: string, input: DailyLogInput) {
  const existing = await prisma.dailyLog.findFirst({ where: { id, userId } });
  if (!existing) throw notFound("Log not found.");
  try {
    return toDTO(await prisma.dailyLog.update({ where: { id }, data: data(input) }));
  } catch (error) {
    duplicateDay(error);
  }
}

export async function deleteLog(userId: string, id: string) {
  const { count } = await prisma.dailyLog.deleteMany({ where: { id, userId } });
  if (count === 0) throw notFound("Log not found.");
}
