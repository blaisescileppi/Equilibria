import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DailyLogForm } from "@/components/logs/daily-log-form";
import { DateNav } from "@/components/date-nav";
import { Card, LoadingBlock, PageHeader } from "@/components/ui";
import { formatDate, isValidISODate } from "@/lib/dates";
import { moodLabel, SYMPTOM_LABELS } from "@/lib/labels";
import { requireUser } from "@/server/auth/current-user";
import { getLogForDate, listRecentLogs } from "@/server/services/daily-logs";
import { getToday } from "@/server/today";

export const metadata: Metadata = { title: "Daily log" };

export default function LogsPage({ searchParams }: PageProps<"/logs">) {
  return (
    <>
      <PageHeader title="Daily log" description="How you felt today, in a few taps." />
      <Suspense fallback={<LoadingBlock />}>
        <LogsContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function LogsContent({ searchParams }: Pick<PageProps<"/logs">, "searchParams">) {
  const [user, today, query] = await Promise.all([requireUser(), getToday(), searchParams]);
  const requested = typeof query.date === "string" ? query.date : "";
  // Unknown or future dates fall back to today rather than erroring.
  const date = isValidISODate(requested) && requested <= today ? requested : today;

  const [log, recent] = await Promise.all([
    getLogForDate(user.id, date),
    listRecentLogs(user.id),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <Card>
        <DateNav basePath="/logs" date={date} today={today} />
        {/* key resets the form's state when the date changes */}
        <DailyLogForm key={date} date={date} log={log} />
      </Card>

      <Card className="h-fit">
        <h2 className="mb-3 font-semibold">Recent entries</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-stone-600">Nothing logged yet.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {recent.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={`/logs?date=${entry.date}`}
                  className="flex items-start gap-3 py-2 hover:bg-stone-50"
                >
                  <span aria-hidden className="text-xl">
                    {moodLabel(entry.mood).emoji}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {formatDate(entry.date, { weekday: "short", year: undefined })}
                    </span>
                    <span className="block truncate text-xs text-stone-600">
                      {entry.symptoms.length
                        ? entry.symptoms.map((s) => SYMPTOM_LABELS[s]).join(", ")
                        : moodLabel(entry.mood).label}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
