import type { Metadata } from "next";
import { Suspense } from "react";
import { NutritionPanel } from "@/components/meals/nutrition-panel";
import { Card, EmptyState, LoadingBlock, PageHeader } from "@/components/ui";
import { computeInsights } from "@/lib/cycles";
import { addDays, formatDate } from "@/lib/dates";
import { BEFORE_PERIOD_DAYS, moodCounts, symptomsByPhase, type Phase } from "@/lib/insights";
import { MOODS, SYMPTOM_LABELS } from "@/lib/labels";
import { requireUser } from "@/server/auth/current-user";
import { listCycles } from "@/server/services/cycles";
import { listLogsBetween } from "@/server/services/daily-logs";
import { averageDailyIntake } from "@/server/services/meals";
import { getToday } from "@/server/today";

export const metadata: Metadata = { title: "Insights" };

const LOOKBACK_DAYS = 90;

const PHASE_LABELS: Record<Phase, string> = {
  period: "During your period",
  beforePeriod: `${BEFORE_PERIOD_DAYS} days before a period`,
  otherDays: "Other days",
};

export default function InsightsPage() {
  return (
    <>
      <PageHeader
        title="Insights"
        description="Patterns from what you've logged. These are summaries of your own data, not medical advice."
      />
      <Suspense fallback={<LoadingBlock />}>
        <InsightsContent />
      </Suspense>
    </>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card>
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-brand-ink">{value}</p>
      {note && <p className="mt-1 text-xs text-stone-500">{note}</p>}
    </Card>
  );
}

async function InsightsContent() {
  const [user, today] = await Promise.all([requireUser(), getToday()]);
  const from = addDays(today, -(LOOKBACK_DAYS - 1));
  const [cycles, logs, intake] = await Promise.all([
    listCycles(user.id),
    listLogsBetween(user.id, from, today),
    averageDailyIntake(user.id, addDays(today, -6), today),
  ]);

  const insights = computeInsights(cycles, today);
  const phases = symptomsByPhase(logs, cycles);
  const moods = moodCounts(logs);
  const maxLength = Math.max(...insights.recentCycleLengths, 1);

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Cycle</h2>
        {insights.periodsLogged === 0 ? (
          <EmptyState title="No periods logged yet">Log a few periods to see your averages.</EmptyState>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Average cycle"
                value={insights.averageCycleLength ? `${insights.averageCycleLength} days` : "—"}
                note={
                  insights.recentCycleLengths.length
                    ? `From your last ${insights.recentCycleLengths.length} cycle${insights.recentCycleLengths.length > 1 ? "s" : ""}`
                    : "Needs two logged periods"
                }
              />
              <Stat
                label="Average period"
                value={insights.averagePeriodLength ? `${insights.averagePeriodLength} days` : "—"}
              />
              <Stat
                label="Next period (estimate)"
                value={insights.predictedNextStart ? formatDate(insights.predictedNextStart, { year: undefined }) : "—"}
                note={
                  insights.daysUntilNext === null
                    ? undefined
                    : insights.daysUntilNext >= 0
                      ? `In about ${insights.daysUntilNext} days`
                      : `Expected ${-insights.daysUntilNext} days ago`
                }
              />
              <Stat
                label="Cycle range"
                value={insights.shortestCycle ? `${insights.shortestCycle}–${insights.longestCycle} days` : "—"}
                note={
                  insights.isVariable
                    ? "Your cycle lengths vary by more than a week. Predictions will be less precise."
                    : undefined
                }
              />
            </div>

            {insights.recentCycleLengths.length > 0 && (
              <Card>
                <h3 className="mb-3 text-sm font-semibold">Recent cycle lengths</h3>
                <ol className="space-y-2">
                  {insights.recentCycleLengths.map((length, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <span className="w-16 shrink-0 text-stone-500">Cycle {i + 1}</span>
                      <span className="h-3 rounded-full bg-period" style={{ width: `${(length / maxLength) * 100}%` }} />
                      <span className="tabular-nums">{length}d</span>
                    </li>
                  ))}
                </ol>
              </Card>
            )}
          </>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Symptoms and mood, last {LOOKBACK_DAYS} days</h2>
        {logs.length === 0 ? (
          <EmptyState title="No daily logs in this period">Check in on the Daily log page to see patterns.</EmptyState>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="grid gap-4 sm:grid-cols-3">
              {(Object.keys(PHASE_LABELS) as Phase[]).map((phase) => (
                <Card key={phase}>
                  <h3 className="text-sm font-semibold">{PHASE_LABELS[phase]}</h3>
                  <p className="text-xs text-stone-500">{phases[phase].days} logged days</p>
                  {phases[phase].top.length === 0 ? (
                    <p className="mt-3 text-sm text-stone-600">No symptoms logged.</p>
                  ) : (
                    <ul className="mt-3 space-y-1 text-sm">
                      {phases[phase].top.map((item) => (
                        <li key={item.symptom} className="flex justify-between gap-2">
                          <span>{SYMPTOM_LABELS[item.symptom]}</span>
                          <span className="text-stone-500">{Math.round(item.share * 100)}% of days</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              ))}
            </div>
            <Card>
              <h3 className="mb-3 text-sm font-semibold">Mood ({logs.length} days)</h3>
              <ul className="space-y-2">
                {MOODS.map((mood) => (
                  <li key={mood.value} className="flex items-center gap-2 text-sm">
                    <span aria-hidden>{mood.emoji}</span>
                    <span className="w-12">{mood.label}</span>
                    <span
                      className="h-2.5 rounded-full bg-brand/70"
                      style={{ width: `${(moods[mood.value] / logs.length) * 100}%` }}
                    />
                    <span className="text-stone-500">{moods[mood.value]}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Nutrition, last 7 days</h2>
        {intake.daysLogged === 0 ? (
          <EmptyState title="No meals logged this week" />
        ) : (
          <div className="max-w-xl">
            <NutritionPanel
              totals={intake.average}
              title={`Daily average over ${intake.daysLogged} logged day${intake.daysLogged > 1 ? "s" : ""}`}
            />
          </div>
        )}
      </section>
    </div>
  );
}
