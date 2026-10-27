import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const fromRoot = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": fromRoot("./src"),
      // `server-only` throws when imported outside Next's server bundle.
      // Tests run server code directly, so it is swapped for an empty module.
      "server-only": fromRoot("./test/stubs/server-only.ts"),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["test/integration/**/*.test.ts"],
          environment: "node",
          globalSetup: ["test/global-setup.ts"],
          setupFiles: ["test/setup-env.ts"],
          // All files share one test database, so they run one at a time.
          fileParallelism: false,
        },
      },
    ],
  },
});
