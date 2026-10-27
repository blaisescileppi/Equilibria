import type { Metadata } from "next";
import { Suspense } from "react";
import { CycleManager } from "@/components/cycles/cycle-manager";
import { LoadingBlock, PageHeader } from "@/components/ui";
import { requireUser } from "@/server/auth/current-user";
import { listCycles } from "@/server/services/cycles";
import { getToday } from "@/server/today";

export const metadata: Metadata = { title: "Periods" };

export default function CyclesPage() {
  return (
    <>
      <PageHeader
        title="Periods"
        description="Log the first and last day of each period. Cycle length is the number of days from one start date to the next."
      />
      <Suspense fallback={<LoadingBlock />}>
        <CyclesContent />
      </Suspense>
    </>
  );
}

async function CyclesContent() {
  const user = await requireUser();
  const [cycles, today] = await Promise.all([listCycles(user.id), getToday()]);
  return <CycleManager cycles={cycles} today={today} />;
}
