"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Mood, Symptom } from "@/generated/prisma/enums";
import { api } from "@/lib/api-client";
import type { ISODate } from "@/lib/dates";
import { MOODS, SYMPTOM_LABELS } from "@/lib/labels";
import { dailyLogSchema, fieldErrors } from "@/lib/validation";
import { Alert, Button, cn, Field } from "../ui";

type Log = { id: string; mood: Mood; symptoms: Symptom[]; notes: string | null };

export function DailyLogForm({ date, log }: { date: ISODate; log: Log | null }) {
  const router = useRouter();
  const [mood, setMood] = useState<Mood | null>(log?.mood ?? null);
  const [symptoms, setSymptoms] = useState<Symptom[]>(log?.symptoms ?? []);
  const [notes, setNotes] = useState(log?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  function toggle(symptom: Symptom) {
    setSymptoms((current) =>
      current.includes(symptom) ? current.filter((s) => s !== symptom) : [...current, symptom],
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = dailyLogSchema.safeParse({ date, mood, symptoms, notes });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));

    setPending(true);
    const result = log
      ? await api(`/api/logs/${log.id}`, { method: "PUT", body: parsed.data })
      : await api("/api/logs", { method: "POST", body: parsed.data });
    setPending(false);

    if (!result.ok) {
      setErrors(result.fields);
      setMessage({ tone: "error", text: result.error });
      return;
    }
    setErrors({});
    setMessage({ tone: "info", text: log ? "Changes saved." : "Logged. Nice work checking in." });
    router.refresh();
  }

  async function onDelete() {
    if (!log || !window.confirm("Delete this day's log?")) return;
    setPending(true);
    const result = await api(`/api/logs/${log.id}`, { method: "DELETE" });
    setPending(false);
    if (!result.ok) return setMessage({ tone: "error", text: result.error });
    setMood(null);
    setSymptoms([]);
    setNotes("");
    setMessage({ tone: "info", text: "Log deleted." });
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-stone-800">Mood</legend>
        <div className="grid grid-cols-5 gap-2">
          {MOODS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={mood === option.value}
              onClick={() => setMood(option.value)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border px-1 py-3 text-xs transition-colors",
                mood === option.value
                  ? "border-brand bg-brand-soft text-brand-ink"
                  : "border-stone-200 hover:bg-stone-50",
              )}
            >
              <span aria-hidden className="text-2xl">
                {option.emoji}
              </span>
              {option.label}
            </button>
          ))}
        </div>
        {errors.mood && <p className="mt-1 text-xs text-red-700">{errors.mood}</p>}
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-stone-800">Symptoms</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SYMPTOM_LABELS) as Symptom[]).map((symptom) => {
            const selected = symptoms.includes(symptom);
            return (
              <button
                key={symptom}
                type="button"
                aria-pressed={selected}
                onClick={() => toggle(symptom)}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors",
                  selected
                    ? "border-brand bg-brand text-white"
                    : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50",
                )}
              >
                {SYMPTOM_LABELS[symptom]}
              </button>
            );
          })}
        </div>
        {errors.symptoms && <p className="mt-1 text-xs text-red-700">{errors.symptoms}</p>}
      </fieldset>

      <Field label="Notes" name="notes" error={errors.notes} hint="Optional. Only you can see these.">
        {(props) => (
          <textarea
            {...props}
            rows={4}
            maxLength={2000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        )}
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : log ? "Save changes" : "Save log"}
        </Button>
        {log && (
          <Button type="button" variant="danger" onClick={onDelete} disabled={pending}>
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
