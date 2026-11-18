import { defineConfig } from "@playwright/test";
import { loadEnv } from "vite";
const env = loadEnv("test", process.cwd(), "");
if (!env.DATABASE_URL || !new URL(env.DATABASE_URL).pathname.endsWith("_test"))
  throw new Error("E2E requires a dedicated *_test database in .env.test.");
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: "http://127.0.0.1:14387",
    channel: process.env.CI ? undefined : "chrome",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npx next dev --hostname 127.0.0.1 --port 14387",
    url: "http://127.0.0.1:14387",
    reuseExistingServer: false,
    env: { ...env, BETTER_AUTH_URL: "http://127.0.0.1:14387" },
    timeout: 60000,
  },
});
