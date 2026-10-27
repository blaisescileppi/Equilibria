import type { MealTag, MealType, Mood, Symptom } from "@/generated/prisma/enums";

// Human-readable names for database enums, kept in one place so the
// calendar, forms, and insights all say the same thing.

export const MOODS: { value: Mood; label: string; emoji: string }[] = [
  { value: "GREAT", label: "Great", emoji: "😄" },
  { value: "GOOD", label: "Good", emoji: "🙂" },
  { value: "OKAY", label: "Okay", emoji: "😐" },
  { value: "LOW", label: "Low", emoji: "😔" },
  { value: "BAD", label: "Bad", emoji: "😣" },
];

export const moodLabel = (mood: Mood) => MOODS.find((m) => m.value === mood)!;

export const SYMPTOM_LABELS: Record<Symptom, string> = {
  CRAMPS: "Cramps",
  BLOATING: "Bloating",
  HEADACHE: "Headache",
  ACNE: "Acne",
  FATIGUE: "Fatigue",
  BREAST_TENDERNESS: "Breast tenderness",
  BACK_PAIN: "Back pain",
  NAUSEA: "Nausea",
  CRAVINGS: "Cravings",
  INSOMNIA: "Trouble sleeping",
  MOOD_SWINGS: "Mood swings",
  ANXIETY: "Anxiety",
};

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snacks",
};

export const MEAL_TAG_LABELS: Record<MealTag, string> = {
  HIGH_PROTEIN: "High protein",
  IRON_RICH: "Iron-rich",
  HIGH_FIBER: "High fiber",
  VEGETARIAN: "Vegetarian",
  VEGAN: "Vegan",
  GLUTEN_FREE: "Gluten-free",
  DAIRY_FREE: "Dairy-free",
  LOW_SUGAR: "Low sugar",
  QUICK: "Under 20 minutes",
  BUDGET: "Budget-friendly",
};
