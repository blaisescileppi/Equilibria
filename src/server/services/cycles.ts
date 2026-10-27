import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { computeInsights, periodsOverlap } from "@/lib/cycles";
import { prisma } from "@/lib/db";
import { formatDate, toDate, toISODate, type ISODate } from "@/lib/dates";
import type { CycleInput } from "@/lib/validation";
import { conflict, HttpError, notFound } from "../http";

// Every function takes the signed-in user's id and filters by it, so one
// user can never read or change another user's periods.

export type CycleDTO = { id: string; startDate: ISODate; endDate: ISODate | null };

function toDTO(row: { id: string; startDate: Date; endDate: Date | null }): CycleDTO {
  return {
    id: row.id,
    startDate: toISODate(row.startDate),
    endDate: row.endDate ? toISODate(row.endDate) : null,
  };
}

export async function listCycles(userId: string): Promise<CycleDTO[]> {
  const rows = await prisma.cycle.findMany({
    where: { userId },
    orderBy: { startDate: "desc" },
  });
  return rows.map(toDTO);
}

export async function getCycleInsights(userId: string, today: ISODate) {
  return computeInsights(await listCycles(userId), today);
}

type Tx = Prisma.TransactionClient;

/** Rules that need the user's other periods, checked inside the transaction. */
async function assertConsistent(tx: Tx, userId: string, input: CycleInput, excludeId?: string) {
  const others = (await tx.cycle.findMany({ where: { userId, NOT: { id: excludeId } } })).map(toDTO);

  const clash = others.find((other) => periodsOverlap(input, other));
  if (clash) {
    throw conflict("This overlaps a period you already logged.", {
      startDate: `Overlaps the period starting ${formatDate(clash.startDate)}.`,
    });
  }

  // An ongoing period must be the most recent one; otherwise the calendar
  // would draw two open-ended periods at once.
  const ongoing = others.find((other) => other.endDate === null);
  if (ongoing && (input.endDate === null || input.startDate > ongoing.startDate)) {
    throw conflict("Add an end date to your current period first.", {
      startDate: `The period starting ${formatDate(ongoing.startDate)} has no end date yet.`,
    });
  }
}

/**
 * Serializable isolation makes "check for overlaps, then write" atomic:
 * if two requests race, Postgres aborts one instead of saving both.
 */
async function serializable<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  try {
    return await prisma.$transaction(fn, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new HttpError(409, "Another change happened at the same time. Please try again.");
    }
    throw error;
  }
}

export function createCycle(userId: string, input: CycleInput): Promise<CycleDTO> {
  return serializable(async (tx) => {
    await assertConsistent(tx, userId, input);
    const row = await tx.cycle.create({
      data: {
        userId,
        startDate: toDate(input.startDate),
        endDate: input.endDate ? toDate(input.endDate) : null,
      },
    });
    return toDTO(row);
  });
}

export function updateCycle(userId: string, id: string, input: CycleInput): Promise<CycleDTO> {
  return serializable(async (tx) => {
    const existing = await tx.cycle.findFirst({ where: { id, userId } });
    if (!existing) throw notFound("Period not found.");
    await assertConsistent(tx, userId, input, id);
    const row = await tx.cycle.update({
      where: { id },
      data: {
        startDate: toDate(input.startDate),
        endDate: input.endDate ? toDate(input.endDate) : null,
      },
    });
    return toDTO(row);
  });
}

export async function deleteCycle(userId: string, id: string): Promise<void> {
  // Filtering by userId as well as id: deleting someone else's row is a 404.
  const { count } = await prisma.cycle.deleteMany({ where: { id, userId } });
  if (count === 0) throw notFound("Period not found.");
}
