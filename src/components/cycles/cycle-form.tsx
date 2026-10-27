"use client";

import { useState, type FormEvent } from "react";
import type { ISODate } from "@/lib/dates";
import { api } from "@/lib/api-client";
import { cycleSchema, fieldErrors } from "@/lib/validation";
import { Alert, Button, Field } from "../ui";

type Props = {
  today: ISODate;
  initial?: { id: string; startDate: ISODate; endDate: ISODate | null };
  onSaved: () => void;
  onCancel?: () => void;
};

// One form for both "add" (POST) and "edit" (PUT), decided by `initial`.
export function CycleForm({ today, initial, onSaved, onCancel }: Props) {
  const [ongoing, setOngoing] = useState(initial ? initial.endDate === null : false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const values = {
      startDate: String(data.get("startDate") ?? ""),
      endDate: ongoing ? null : String(data.get("endDate") ?? "") || null,
    };

    // A blank end date means "ongoing" to the API, so only allow it when
    // the checkbox says so; otherwise a forgotten field silently changes meaning.
    if (!ongoing && !values.endDate) {
      return setErrors({ endDate: 'Enter the last day, or tick "Still ongoing".' });
    }

    const parsed = cycleSchema.safeParse(values);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));

    setPending(true);
    const result = initial
      ? await api(`/api/cycles/${initial.id}`, { method: "PUT", body: parsed.data })
      : await api("/api/cycles", { method: "POST", body: parsed.data });
    setPending(false);

    if (!result.ok) {
      setErrors(result.fields);
      setFormError(result.error);
      return;
    }
    setErrors({});
    setFormError(null);
    if (!initial) form.reset();
    onSaved();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError && <Alert>{formError}</Alert>}
      <Field label="First day" name="startDate" error={errors.startDate}>
        {(props) => (
          <input {...props} type="date" max={today} defaultValue={initial?.startDate ?? today} />
        )}
      </Field>
      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={ongoing}
          onChange={(e) => setOngoing(e.target.checked)}
          className="size-4 accent-brand"
        />
        Still ongoing
      </label>
      {!ongoing && (
        <Field label="Last day" name="endDate" error={errors.endDate}>
          {(props) => (
            <input {...props} type="date" max={today} defaultValue={initial?.endDate ?? ""} />
          )}
        </Field>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : initial ? "Save changes" : "Add period"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
