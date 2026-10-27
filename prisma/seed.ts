// Seeds the food library and a demo account. Run with `npm run db:seed`.
// Safe to re-run: library foods are upserted by a stable id and the demo
// users are deleted (cascading to their data) and recreated.
//
// Demo login (local development only):
//   email:    demo@equilibria.test
//   password: equilibria-demo

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient, type MealTag, type MealType, type Mood, type Symptom } from "../src/generated/prisma/client";
import { addDays, toDate, todayISO, type ISODate } from "../src/lib/dates";
import { NUTRIENT_KEYS } from "../src/lib/nutrition";
import foodLibrary from "./data/foods.json";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

export const DEMO_EMAIL = "demo@equilibria.test";
const DEMO_PASSWORD = "equilibria-demo";
const COMMUNITY_EMAIL = "maya@equilibria.test";

// Small deterministic random generator (mulberry32), so every seed run
// produces the same demo data.
function random(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = random(20261027);
const pick = <T>(items: readonly T[]) => items[Math.floor(rand() * items.length)];

async function seedFoodLibrary() {
  for (const food of foodLibrary.foods) {
    const data = {
      name: food.name,
      servingSize: food.servingSize,
      servingUnit: food.servingUnit,
      ...Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, food[k]])),
    } as Parameters<typeof prisma.food.create>[0]["data"];
    await prisma.food.upsert({
      where: { id: `usda-${food.usdaFdcId}` },
      create: { id: `usda-${food.usdaFdcId}`, ...data },
      update: data,
    });
  }
  return foodLibrary.foods.length;
}

const libraryId = (name: string) => {
  const food = foodLibrary.foods.find((f) => f.name === name);
  if (!food) throw new Error(`Seed refers to unknown library food "${name}"`);
  return `usda-${food.usdaFdcId}`;
};

async function seedDemoUser(today: ISODate) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const user = await prisma.user.create({
    data: { email: DEMO_EMAIL, passwordHash, displayName: "Demo" },
  });

  // Six past periods ending with one that started 9 days ago.
  const cycleLengths = [29, 27, 30, 28, 31, 28];
  let start = addDays(today, -9);
  const starts: ISODate[] = [start];
  for (const length of cycleLengths.slice(0, 5)) {
    start = addDays(start, -length);
    starts.unshift(start);
  }
  const periods = starts.map((s) => ({ startDate: s, endDate: addDays(s, 3 + Math.floor(rand() * 3)) }));
  await prisma.cycle.createMany({
    data: periods.map((p) => ({ userId: user.id, startDate: toDate(p.startDate), endDate: toDate(p.endDate) })),
  });

  // About six weeks of daily logs, with symptoms that loosely follow the cycle.
  const isPeriodDay = (d: ISODate) => periods.some((p) => d >= p.startDate && d <= p.endDate);
  const isLateCycle = (d: ISODate) =>
    starts.some((s) => d >= addDays(s, -5) && d < s) || d >= addDays(today, 15);
  const notes = [
    "Slept badly, lots of coffee.",
    "Went for a long walk, felt better after.",
    "Busy day at school.",
    "Yoga in the evening helped.",
    "Felt really productive today.",
  ];

  const logs = [];
  for (let offset = 42; offset >= 0; offset--) {
    const date = addDays(today, -offset);
    if (offset > 0 && rand() < 0.25) continue; // skipped days look realistic
    const symptoms = new Set<Symptom>();
    let mood: Mood = pick(["GREAT", "GOOD", "GOOD", "OKAY"] as const);
    if (isPeriodDay(date)) {
      symptoms.add("CRAMPS");
      if (rand() < 0.6) symptoms.add("FATIGUE");
      if (rand() < 0.4) symptoms.add("BACK_PAIN");
      mood = pick(["OKAY", "LOW", "LOW", "GOOD"] as const);
    } else if (isLateCycle(date)) {
      if (rand() < 0.6) symptoms.add("BLOATING");
      if (rand() < 0.5) symptoms.add("CRAVINGS");
      if (rand() < 0.4) symptoms.add("MOOD_SWINGS");
      if (rand() < 0.3) symptoms.add("ACNE");
      mood = pick(["OKAY", "LOW", "GOOD"] as const);
    } else if (rand() < 0.15) {
      symptoms.add(pick(["HEADACHE", "INSOMNIA", "ANXIETY"] as const));
    }
    logs.push({
      userId: user.id,
      date: toDate(date),
      mood,
      symptoms: [...symptoms],
      notes: rand() < 0.3 ? pick(notes) : null,
    });
  }
  await prisma.dailyLog.createMany({ data: logs });

  const overnightOats = await prisma.food.create({
    data: {
      name: "Overnight oats (my recipe)",
      servingSize: 1,
      servingUnit: "jar",
      createdById: user.id,
      calories: 380, proteinG: 18, carbsG: 52, fatG: 11, fiberG: 9, sugarG: 14,
      ironMg: 3.1, calciumMg: 320, folateMcg: 60, vitaminDMcg: 2.9, vitaminB12Mcg: 1.3,
      magnesiumMg: 120, zincMg: 2.6, potassiumMg: 560, sodiumMg: 140, vitaminCMg: 8,
    },
  });

  // A week of meals.
  const menu: Record<MealType, string[][]> = {
    BREAKFAST: [["Greek yogurt, plain nonfat", "Blueberries", "Chia seeds"], ["Egg", "Whole wheat bread", "Avocado"]],
    LUNCH: [["Lentils, cooked", "Spinach, raw", "Brown rice, cooked"], ["Chicken breast, roasted", "Quinoa, cooked", "Broccoli, cooked"]],
    DINNER: [["Salmon, cooked", "Sweet potato, baked", "Asparagus, cooked"], ["Tofu, firm", "White rice, cooked", "Red bell pepper, raw"]],
    SNACK: [["Apple", "Peanut butter"], ["Almonds"], ["Dark chocolate (70-85%)"]],
  };
  const entries = [];
  for (let offset = 6; offset >= 0; offset--) {
    const date = toDate(addDays(today, -offset));
    for (const mealType of Object.keys(menu) as MealType[]) {
      if (offset === 0 && mealType === "DINNER") continue; // "today" isn't over yet
      const useOats = mealType === "BREAKFAST" && rand() < 0.3;
      const foods = useOats ? [] : pick(menu[mealType]);
      if (useOats) entries.push({ userId: user.id, date, mealType, foodId: overnightOats.id, servings: 1 });
      for (const name of foods) {
        entries.push({ userId: user.id, date, mealType, foodId: libraryId(name), servings: pick([1, 1, 1.5, 0.5]) });
      }
    }
  }
  await prisma.mealEntry.createMany({ data: entries });

  return { user, logs: logs.length, entries: entries.length };
}

async function seedBoard(demoUserId: string) {
  const maya = await prisma.user.create({
    data: {
      email: COMMUNITY_EMAIL,
      displayName: "Maya",
      passwordHash: await bcrypt.hash(`unused-${Date.now()}`, 4), // nobody logs in as Maya
    },
  });

  const posts: {
    authorId: string;
    title: string;
    description: string;
    ingredients: string;
    instructions: string;
    tags: MealTag[];
  }[] = [
    {
      authorId: maya.id,
      title: "Red lentil & spinach dal",
      description: "A cozy, iron-rich dinner that comes together in one pot. Great for period weeks.",
      ingredients: "1 cup red lentils\n2 cups spinach\n1 onion, diced\n2 cloves garlic\n1 tsp turmeric\n1 tsp cumin\n1 can light coconut milk",
      instructions: "Saute onion and garlic. Add spices for a minute. Add lentils, coconut milk, and 2 cups water. Simmer 20 minutes, then stir in spinach.",
      tags: ["IRON_RICH", "VEGAN", "BUDGET", "HIGH_FIBER"],
    },
    {
      authorId: maya.id,
      title: "Salmon power bowl",
      description: "Salmon, quinoa, and roasted veg. High in protein and vitamin D.",
      ingredients: "1 salmon fillet\n1 cup cooked quinoa\n1 cup broccoli\n1/2 avocado\nSoy sauce and sesame seeds",
      instructions: "Roast salmon and broccoli at 400F for 12-15 minutes. Serve over quinoa with avocado.",
      tags: ["HIGH_PROTEIN", "GLUTEN_FREE", "DAIRY_FREE"],
    },
    {
      authorId: demoUserId,
      title: "Chia pudding with berries",
      description: "Make it the night before. Fiber, omega-3s, and calcium if you use fortified milk.",
      ingredients: "3 tbsp chia seeds\n1 cup soy milk\n1 tsp maple syrup\n1/2 cup raspberries",
      instructions: "Stir chia, milk, and maple syrup. Refrigerate overnight. Top with berries.",
      tags: ["VEGAN", "HIGH_FIBER", "QUICK"],
    },
    {
      authorId: maya.id,
      title: "Greek yogurt parfait",
      description: "Five-minute breakfast with lots of protein. Use plain yogurt to keep sugar down.",
      ingredients: "1 cup plain Greek yogurt\n1/2 cup blueberries\n2 tbsp walnuts\n1 tsp honey",
      instructions: "Layer everything in a glass.",
      tags: ["HIGH_PROTEIN", "QUICK", "VEGETARIAN", "LOW_SUGAR"],
    },
    {
      authorId: maya.id,
      title: "Black bean & sweet potato tacos",
      description: "Cheap, filling, and full of fiber and potassium.",
      ingredients: "1 sweet potato, cubed\n1 can black beans\n6 corn tortillas\nSalsa, lime, cilantro",
      instructions: "Roast sweet potato cubes at 425F for 25 minutes. Warm beans with cumin. Fill tortillas and top with salsa.",
      tags: ["VEGAN", "BUDGET", "HIGH_FIBER", "GLUTEN_FREE"],
    },
  ];

  const created = [];
  for (const post of posts) created.push(await prisma.mealPost.create({ data: post }));

  await prisma.postLike.createMany({
    data: [
      { userId: demoUserId, postId: created[0].id },
      { userId: demoUserId, postId: created[1].id },
      { userId: maya.id, postId: created[2].id },
      { userId: maya.id, postId: created[0].id },
    ],
  });
  await prisma.postFavorite.createMany({
    data: [{ userId: demoUserId, postId: created[0].id }],
  });
  return created.length;
}

async function main() {
  const today = todayISO();
  const foods = await seedFoodLibrary();
  await prisma.user.deleteMany({ where: { email: { in: [DEMO_EMAIL, COMMUNITY_EMAIL] } } });
  const demo = await seedDemoUser(today);
  const posts = await seedBoard(demo.user.id);

  console.log(
    `Seeded ${foods} library foods, demo user ${DEMO_EMAIL} with ${demo.logs} daily logs and ${demo.entries} meal entries, and ${posts} meal posts.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
