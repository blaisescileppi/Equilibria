import "dotenv/config";
import { afterAll } from "vitest";

// Runs before each integration test file is imported, so the Prisma client
// in src/lib/db.ts connects to the test database, never the dev one.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

afterAll(async () => {
  const { prisma } = await import("@/lib/db");
  await prisma.$disconnect();
});
