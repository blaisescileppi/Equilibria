import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { todayInTimeZone, type ISODate } from "@/lib/dates";

export const TIMEZONE_COOKIE = "tz";

/** The signed-in viewer's "today", using the time zone their browser reported. */
export async function getToday(): Promise<ISODate> {
  // Reading the clock must happen per request, never at build time, or a
  // prerendered page would show the day it was built. connection() makes
  // that explicit to Next.js.
  await connection();
  const timeZone = (await cookies()).get(TIMEZONE_COOKIE)?.value ?? "UTC";
  return todayInTimeZone(timeZone);
}
