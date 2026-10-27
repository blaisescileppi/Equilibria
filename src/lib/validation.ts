import { z } from "zod";
import { MealTag, MealType, Mood, Symptom } from "@/generated/prisma/enums";
import { addDays, isValidISODate, todayISO } from "./dates";
import { NUTRIENTS } from "./nutrition";

// Every request body and query string is parsed with one of these schemas
// before it reaches the database. The same schemas run in the browser for
// instant form feedback, but the server never trusts that and checks again.

const isoDate = z.string().refine(isValidISODate, "Enter a valid date (YYYY-MM-DD).");

// One day of slack: a user ahead of UTC can legitimately be on "tomorrow".
const pastOrToday = isoDate.refine(
  (d) => d <= addDays(todayISO(), 1),
  "Date can't be in the future.",
);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .transform((s) => (s === "" ? null : s))
    .nullish()
    .transform((s) => s ?? null);

const id = z.string().min(1).max(64);

// ---------- Auth ----------

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address."));

// bcrypt only uses the first 72 *bytes* of a password, so longer ones are
// rejected instead of being silently truncated. Bytes, not characters:
// "é" or an emoji takes 2-4 bytes in UTF-8.
const MAX_PASSWORD_BYTES = 72;
const withinBcryptLimit = (p: string) => new TextEncoder().encode(p).length <= MAX_PASSWORD_BYTES;

export const signupSchema = z.object({
  email,
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .refine(withinBcryptLimit, "That password is too long. Use at most 72 characters."),
  displayName: z
    .string()
    .trim()
    .min(1, "Enter a display name.")
    .max(40, "Keep it under 40 characters."),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").refine(withinBcryptLimit, "Incorrect email or password."),
});

// ---------- Cycles ----------

export const MAX_PERIOD_LENGTH_DAYS = 15;

export const cycleSchema = z
  .object({
    startDate: pastOrToday,
    endDate: pastOrToday.nullish().transform((d) => d ?? null),
  })
  .refine((c) => !c.endDate || c.endDate >= c.startDate, {
    path: ["endDate"],
    error: "End date must be on or after the start date.",
  })
  .refine(
    (c) =>
      !c.endDate || c.endDate <= addDays(c.startDate, MAX_PERIOD_LENGTH_DAYS - 1),
    {
      path: ["endDate"],
      error: `A period longer than ${MAX_PERIOD_LENGTH_DAYS} days is likely a typo. Check the dates.`,
    },
  );

// ---------- Daily logs ----------

export const dailyLogSchema = z.object({
  date: pastOrToday,
  mood: z.enum(Mood, "Pick a mood."),
  symptoms: z
    .array(z.enum(Symptom))
    .max(Object.keys(Symptom).length)
    .refine((s) => new Set(s).size === s.length, "Symptoms must not repeat.")
    .default([]),
  notes: optionalText(2000),
});

export const monthQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use the format YYYY-MM.")
    .optional(),
});

// ---------- Foods & meal entries ----------

const nutrientShape = Object.fromEntries(
  NUTRIENTS.map((n) => [
    n.key,
    z
      .number(`${n.label} must be a number.`)
      .min(0, `${n.label} can't be negative.`)
      // 20x the daily reference in one serving is certainly a typo.
      .max(n.reference * 20, `${n.label} looks too high for one serving.`),
  ]),
) as Record<(typeof NUTRIENTS)[number]["key"], z.ZodNumber>;

export const foodSchema = z.object({
  name: z.string().trim().min(2, "Enter a food name.").max(80),
  servingSize: z.number("Serving size must be a number.").positive("Must be more than 0.").max(5000),
  servingUnit: z.string().trim().min(1, "Enter a unit, e.g. g or cup.").max(20),
  ...nutrientShape,
});

export const foodSearchSchema = z.object({
  q: z.string().trim().max(80).default(""),
});

export const mealEntrySchema = z.object({
  date: pastOrToday,
  mealType: z.enum(MealType, "Pick a meal."),
  foodId: id,
  servings: z
    .number("Servings must be a number.")
    .positive("Servings must be more than 0.")
    .max(50, "That's a lot of servings. Check the number."),
});

export const dayQuerySchema = z.object({
  date: isoDate.optional(),
});

// ---------- Meal suggestions board ----------

export const postSchema = z.object({
  title: z.string().trim().min(3, "Give your meal a title.").max(100),
  description: z.string().trim().min(10, "Add a short description (10+ characters).").max(1000),
  ingredients: z.string().trim().min(3, "List at least one ingredient.").max(3000),
  instructions: optionalText(5000),
  tags: z
    .array(z.enum(MealTag))
    .max(5, "Pick up to 5 tags.")
    .refine((t) => new Set(t).size === t.length, "Tags must not repeat.")
    .default([]),
});

export const postQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  tag: z.enum(MealTag).optional(),
  sort: z.enum(["new", "popular"]).default("new"),
  saved: z
    .enum(["1"])
    .optional()
    .transform((v) => v === "1"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CycleInput = z.infer<typeof cycleSchema>;
export type DailyLogInput = z.infer<typeof dailyLogSchema>;
export type FoodInput = z.infer<typeof foodSchema>;
export type MealEntryInput = z.infer<typeof mealEntrySchema>;
export type PostInput = z.infer<typeof postSchema>;
export type PostQuery = z.infer<typeof postQuerySchema>;

/** Field name -> first error message, for showing next to form inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    result[key] ??= issue.message;
  }
  return result;
}
