import type { Metadata } from "next";
import { Suspense } from "react";
import { DateNav } from "@/components/date-nav";
import { MealLogger } from "@/components/meals/meal-logger";
import { NutritionPanel } from "@/components/meals/nutrition-panel";
import { ButtonLink, Card, LoadingBlock, PageHeader } from "@/components/ui";
import { isValidISODate } from "@/lib/dates";
import { requireUser } from "@/server/auth/current-user";
import { recentFoods } from "@/server/services/foods";
import { getDayTotals, listEntriesForDate } from "@/server/services/meals";
import { getToday } from "@/server/today";

export const metadata: Metadata = { title: "Meals" };

export default function MealsPage({ searchParams }: PageProps<"/meals">) {
  return (
    <>
      <PageHeader
        title="Meals"
        description="Log what you eat to see calories, macros, and key micronutrients for the day."
        actions={
          <ButtonLink href="/meals/foods" variant="secondary">
            My foods
          </ButtonLink>
        }
      />
      <Suspense fallback={<LoadingBlock />}>
        <MealsContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function MealsContent({ searchParams }: Pick<PageProps<"/meals">, "searchParams">) {
  const [user, today, query] = await Promise.all([requireUser(), getToday(), searchParams]);
  const requested = typeof query.date === "string" ? query.date : "";
  const date = isValidISODate(requested) && requested <= today ? requested : today;

  const [entries, totals, recent] = await Promise.all([
    listEntriesForDate(user.id, date),
    getDayTotals(user.id, date),
    recentFoods(user.id),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <Card>
        <DateNav basePath="/meals" date={date} today={today} />
        <MealLogger key={date} date={date} entries={entries} recentFoods={recent} />
      </Card>
      <NutritionPanel totals={totals} />
    </div>
  );
}
