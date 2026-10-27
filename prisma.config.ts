import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 reads its settings (schema location, migrations, database URL)
// from this file instead of from schema.prisma.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Read directly (not with Prisma's env() helper, which throws when it's
    // missing) so `npm install` can generate the client before .env exists.
    // Commands that touch the database still fail clearly without it.
    url: process.env.DATABASE_URL,
  },
});
