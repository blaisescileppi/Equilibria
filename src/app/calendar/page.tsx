import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cn, LoadingBlock, PageHeader } from "@/components/ui";
import { computeInsights, periodDays, predictedPeriodDays } from "@/lib/cycles";
import { addMonths, calendarGrid, isValidMonth, monthOf, toDate } from "@/lib/dates";
import { moodLabel, SYMPTOM_LABELS } from "@/lib/labels";
import { requireUser } from "@/server/auth/current-user";
import { listCycles } from "@/server/services/cycles";
import { listLogsForMonth } from "@/server/services/daily-logs";
import { getToday } from "@/server/today";

export const metadata: Metadata = { title: "Calendar" };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  return (
    <>
      <PageHeader
        title="Calendar"
        description="Your periods, predicted period days, and daily logs. Tap a day to log or edit it."
      />
      <Suspense fallback={<LoadingBlock />}>
        <CalendarContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function CalendarContent({ searchParams }: Pick<PageProps<"/calendar">, "searchParams">) {
  const [user, today, query] = await Promise.all([requireUser(), getToday(), searchParams]);
  const month =
    typeof query.month === "string" && isValidMonth(query.month) ? query.month : monthOf(today);

  const [cycles, logs] = await Promise.all([listCycles(user.id), listLogsForMonth(user.id, month)]);

  // Sets give O(1) "is this day a period day?" lookups while drawing cells.
  const periodSet = new Set(cycles.flatMap((c) => periodDays(c, today)));
  const predictedSet = new Set(predictedPeriodDays(computeInsights(cycles, today)));
  const logsByDate = new Map(logs.map((log) => [log.date, log]));

  const monthName = toDate(`${month}-01`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/calendar?month=${addMonths(month, -1)}`}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100"
        >
          ← <span className="sr-only">Previous month</span>
        </Link>
        <h2 className="text-lg font-semibold">{monthName}</h2>
        <Link
          href={`/calendar?month=${addMonths(month, 1)}`}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100"
        >
          → <span className="sr-only">Next month</span>
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-stone-500">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarGrid(month).map((day) => {
          const inMonth = monthOf(day) === month;
          const log = logsByDate.get(day);
          const isPeriod = periodSet.has(day);
          const isPredicted = !isPeriod && predictedSet.has(day);
          const isFuture = day > today;

          const description = [
            isPeriod && "period day",
            isPredicted && "predicted period day",
            log && `mood ${moodLabel(log.mood).label}`,
            log?.symptoms.length && log.symptoms.map((s) => SYMPTOM_LABELS[s]).join(", "),
          ]
            .filter(Boolean)
            .join("; ");

          const cell = (
            <>
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs sm:size-7 sm:text-sm",
                  day === today && "bg-stone-900 font-semibold text-white",
                )}
              >
                {Number(day.slice(8))}
              </span>
              {log && (
                <span aria-hidden className="text-base sm:text-xl">
                  {moodLabel(log.mood).emoji}
                </span>
              )}
              {log && log.symptoms.length > 0 && (
                <span className="hidden text-[10px] text-stone-600 sm:block">
                  {log.symptoms.length} symptom{log.symptoms.length > 1 ? "s" : ""}
                </span>
              )}
            </>
          );

          const className = cn(
            "flex min-h-16 flex-col items-center gap-0.5 rounded-lg border p-1 sm:min-h-24 sm:p-2",
            !inMonth && "opacity-40",
            isPeriod && "border-period bg-period-soft",
            isPredicted && "border-dashed border-predicted bg-white",
            !isPeriod && !isPredicted && "border-stone-100",
          );

          return isFuture ? (
            <div key={day} className={className} title={description || undefined}>
              {cell}
            </div>
          ) : (
            <Link
              key={day}
              href={`/logs?date=${day}`}
              className={cn(className, "hover:border-brand")}
              aria-label={`${day}${description ? `: ${description}` : ""}`}
            >
              {cell}
            </Link>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-stone-600">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded border border-period bg-period-soft" /> Period
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded border border-dashed border-predicted" /> Predicted
        </span>
        <span>😄 Mood logged</span>
      </div>
    </div>
  );
}
