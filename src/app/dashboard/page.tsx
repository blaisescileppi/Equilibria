import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonLink, Card, LoadingBlock } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { moodLabel, SYMPTOM_LABELS } from "@/lib/labels";
import { formatAmount } from "@/lib/nutrition";
import { requireUser } from "@/server/auth/current-user";
import { getCycleInsights } from "@/server/services/cycles";
import { getLogForDate } from "@/server/services/daily-logs";
import { getDayTotals } from "@/server/services/meals";
import { getToday } from "@/server/today";

export const metadata: Metadata = { title: "Today" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading your day…" />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const [user, today] = await Promise.all([requireUser(), getToday()]);
  const [insights, log, totals] = await Promise.all([
    getCycleInsights(user.id, today),
    getLogForDate(user.id, today),
    getDayTotals(user.id, today),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-stone-600">{formatDate(today, { weekday: "long" })}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Hi, {user.displayName}</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <h2 className="text-sm font-medium text-stone-500">Cycle</h2>
          {insights.currentCycleDay ? (
            <>
              <p className="mt-2 text-3xl font-semibold text-brand-ink">Day {insights.currentCycleDay}</p>
              <p className="mt-1 text-sm text-stone-600">
                {insights.predictedNextStart
                  ? insights.daysUntilNext! >= 0
                    ? `Next period expected around ${formatDate(insights.predictedNextStart, { year: undefined })} (in ${insights.daysUntilNext} days).`
                    : `Your next period was expected around ${formatDate(insights.predictedNextStart, { year: undefined })}.`
                  : "Log one more period to see a prediction."}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-stone-600">Log your last period to start tracking.</p>
          )}
          <ButtonLink href="/cycles" variant="secondary" className="mt-4">
            Log a period
          </ButtonLink>
        </Card>

        <Card>
          <h2 className="text-sm font-medium text-stone-500">Today&apos;s log</h2>
          {log ? (
            <>
              <p className="mt-2 text-3xl">
                <span aria-hidden>{moodLabel(log.mood).emoji}</span>{" "}
                <span className="text-lg font-semibold">{moodLabel(log.mood).label}</span>
              </p>
              <p className="mt-1 text-sm text-stone-600">
                {log.symptoms.length
                  ? log.symptoms.map((s) => SYMPTOM_LABELS[s]).join(", ")
                  : "No symptoms logged."}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-stone-600">You haven&apos;t checked in today.</p>
          )}
          <ButtonLink href="/logs" variant="secondary" className="mt-4">
            {log ? "Edit today" : "Check in"}
          </ButtonLink>
        </Card>

        <Card>
          <h2 className="text-sm font-medium text-stone-500">Today&apos;s meals</h2>
          <p className="mt-2 text-3xl font-semibold text-brand-ink">
            {formatAmount(totals.calories)} <span className="text-base font-normal text-stone-600">kcal</span>
          </p>
          <p className="mt-1 text-sm text-stone-600">
            {formatAmount(totals.proteinG)} g protein · {formatAmount(totals.ironMg)} mg iron ·{" "}
            {formatAmount(totals.fiberG)} g fiber
          </p>
          <ButtonLink href="/meals" variant="secondary" className="mt-4">
            Log a meal
          </ButtonLink>
        </Card>
      </div>
    </div>
  );
}
