import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import { fileURLToPath } from "node:url";
const env = loadEnv("test", process.cwd(), "");
if (process.env.DATABASE_URL) env.DATABASE_URL = process.env.DATABASE_URL;
if (!env.DATABASE_URL || !new URL(env.DATABASE_URL).pathname.endsWith("_test"))
  throw new Error("Integration tests require a dedicated *_test database.");
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    env,
    testTimeout: 15000,
  },
});
