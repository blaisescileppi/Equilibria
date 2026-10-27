"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import { formatAmount, NUTRIENTS } from "@/lib/nutrition";
import { fieldErrors, foodSchema } from "@/lib/validation";
import { Alert, Button, Card, EmptyState, Field } from "../ui";

type CustomFood = {
  id: string;
  name: string;
  servingSize: number;
  servingUnit: string;
  timesLogged: number;
  nutrients: Record<string, number>;
};

export function CustomFoods({ foods }: { foods: CustomFood[] }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    // Blank nutrient fields mean "none on the label", so they become 0.
    // Text in a number field becomes NaN and fails validation.
    const toNumber = (key: string) => {
      const raw = String(data.get(key) ?? "").trim();
      return raw === "" ? 0 : Number(raw);
    };
    const values = {
      name: String(data.get("name") ?? ""),
      servingSize: Number(data.get("servingSize") || NaN),
      servingUnit: String(data.get("servingUnit") ?? ""),
      ...Object.fromEntries(NUTRIENTS.map((n) => [n.key, toNumber(n.key)])),
    };

    const parsed = foodSchema.safeParse(values);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));

    setPending(true);
    const result = await api("/api/foods", { method: "POST", body: parsed.data });
    setPending(false);
    if (!result.ok) {
      setErrors(result.fields);
      return setMessage({ tone: "error", text: result.error });
    }
    form.reset();
    setErrors({});
    setMessage({ tone: "info", text: `Added ${parsed.data.name}. It now shows up in meal search.` });
    router.refresh();
  }

  async function remove(food: CustomFood) {
    if (!window.confirm(`Delete ${food.name}?`)) return;
    const result = await api(`/api/foods/${food.id}`, { method: "DELETE" });
    if (!result.ok) return setMessage({ tone: "error", text: result.error });
    setMessage(null);
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <Card>
        <h2 className="mb-4 font-semibold">New food</h2>
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          {message && <Alert tone={message.tone}>{message.text}</Alert>}
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
            <Field label="Name" name="name" error={errors.name}>
              {(props) => <input {...props} placeholder="e.g. Mom's chili" maxLength={80} />}
            </Field>
            <Field label="Serving size" name="servingSize" error={errors.servingSize}>
              {(props) => <input {...props} type="number" step="any" min={0} defaultValue={1} />}
            </Field>
            <Field label="Unit" name="servingUnit" error={errors.servingUnit}>
              {(props) => <input {...props} placeholder="cup, g, bowl" maxLength={20} />}
            </Field>
          </div>

          {(["energy", "macro", "micro"] as const).map((group) => (
            <fieldset key={group}>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                {group === "energy" ? "Energy" : group === "macro" ? "Macronutrients" : "Micronutrients"}
              </legend>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {NUTRIENTS.filter((n) => n.group === group).map((n) => (
                  <Field key={n.key} label={`${n.label} (${n.unit})`} name={n.key} error={errors[n.key]}>
                    {(props) => <input {...props} type="number" step="any" min={0} placeholder="0" />}
                  </Field>
                ))}
              </div>
            </fieldset>
          ))}

          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save food"}
          </Button>
        </form>
      </Card>

      <div className="space-y-3">
        <h2 className="font-semibold">Your foods</h2>
        {foods.length === 0 ? (
          <EmptyState title="No custom foods yet" />
        ) : (
          <ul className="space-y-2">
            {foods.map((food) => (
              <li key={food.id}>
                <Card className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{food.name}</p>
                    <p className="text-xs text-stone-500">
                      {formatAmount(food.nutrients.calories)} kcal per {food.servingSize} {food.servingUnit}
                      {food.timesLogged > 0 && ` · logged ${food.timesLogged}×`}
                    </p>
                  </div>
                  <Button variant="danger" onClick={() => remove(food)}>
                    Delete
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
