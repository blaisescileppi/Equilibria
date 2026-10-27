"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { periodLength } from "@/lib/cycles";
import { daysBetween, formatDate, type ISODate } from "@/lib/dates";
import { api } from "@/lib/api-client";
import { Alert, Button, Card, EmptyState } from "../ui";
import { CycleForm } from "./cycle-form";

type Cycle = { id: string; startDate: ISODate; endDate: ISODate | null };

export function CycleManager({ cycles, today }: { cycles: Cycle[]; today: ISODate }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(cycle: Cycle) {
    if (!window.confirm(`Delete the period starting ${formatDate(cycle.startDate)}?`)) return;
    const result = await api(`/api/cycles/${cycle.id}`, { method: "DELETE" });
    if (!result.ok) return setError(result.error);
    setError(null);
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <Card className="h-fit">
        <h2 className="mb-4 font-semibold">Log a period</h2>
        <CycleForm today={today} onSaved={() => router.refresh()} />
      </Card>

      <div className="space-y-3">
        {error && <Alert>{error}</Alert>}
        {cycles.length === 0 ? (
          <EmptyState title="No periods logged yet">
            Add your most recent periods to see cycle insights and predictions.
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {cycles.map((cycle, i) => {
              // Cycles are newest first, so the next period is the previous item.
              const next = cycles[i - 1];
              const cycleLength = next ? daysBetween(cycle.startDate, next.startDate) : null;
              const length = periodLength(cycle);

              return (
                <li key={cycle.id}>
                  <Card>
                    {editingId === cycle.id ? (
                      <CycleForm
                        today={today}
                        initial={cycle}
                        onSaved={() => {
                          setEditingId(null);
                          router.refresh();
                        }}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">
                            {formatDate(cycle.startDate)}
                            {" – "}
                            {cycle.endDate ? formatDate(cycle.endDate) : "ongoing"}
                          </p>
                          <p className="text-sm text-stone-600">
                            {length ? `${length}-day period` : "Period in progress"}
                            {cycleLength !== null && ` · ${cycleLength}-day cycle`}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={() => setEditingId(cycle.id)}>
                            Edit
                          </Button>
                          <Button variant="danger" onClick={() => remove(cycle)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
