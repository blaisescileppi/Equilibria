import "dotenv/config";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll } from "vitest";

// Runs before each integration test file is imported, so the Prisma client
// in src/lib/db.ts connects to the test database, never the dev one, and
// uploaded test images land in a throwaway folder.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.UPLOAD_DIR = path.join(tmpdir(), `equilibria-test-uploads-${process.pid}`);

afterAll(async () => {
  const { prisma } = await import("@/lib/db");
  await prisma.$disconnect();
  await rm(process.env.UPLOAD_DIR!, { recursive: true, force: true });
});
