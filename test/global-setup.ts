import { execSync } from "node:child_process";
import "dotenv/config";

// Runs once before the integration tests: brings the test database's schema
// up to date by applying the same migrations production would use.
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("TEST_DATABASE_URL is not set. See .env.example.");
  }
  // Tests delete every row, so refuse anything that isn't clearly a test DB.
  if (!new URL(url).pathname.includes("test")) {
    throw new Error(`Refusing to run tests against "${url}": its name must contain "test".`);
  }
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  });
}
