import { afterAll, expect, test } from "vitest";
import { Pool } from "pg";
import { GET } from "@/app/api/health/route";
import { db, withTransaction } from "@/server/db";

afterAll(() => db.end());

test("health reports ready only when the database responds", async () => {
  const response = await GET();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "ready" });
});

test("database failure does not expose credentials", async () => {
  const original = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgresql://secret:private@127.0.0.1:1/offline";
  const { healthResponse } = await import("@/server/health");
  const unavailable = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 200,
  });
  try {
    const response = await healthResponse(unavailable);
    expect(response.status).toBe(503);
    expect(await response.text()).toBe('{"status":"unavailable"}');
  } finally {
    process.env.DATABASE_URL = original;
    await unavailable.end();
  }
});

test("transaction failure rolls back writes", async () => {
  await db.query(
    "CREATE TABLE IF NOT EXISTS health_probe (id text PRIMARY KEY)",
  );
  await db.query("DELETE FROM health_probe WHERE id = 'rollback'");
  await expect(
    withTransaction(async (client) => {
      await client.query("INSERT INTO health_probe VALUES ('rollback')");
      throw new Error("abort");
    }),
  ).rejects.toThrow("abort");
  expect(
    (await db.query("SELECT * FROM health_probe WHERE id = 'rollback'"))
      .rowCount,
  ).toBe(0);
});

test("example secret cannot silently become the application signing key", async () => {
  const original = process.env.BETTER_AUTH_SECRET;
  process.env.BETTER_AUTH_SECRET = "GENERATE_WITH_openssl_rand_base64_32";
  try {
    const { getConfig } = await import("@/server/config");
    expect(() => getConfig()).toThrow("configuration");
  } finally {
    process.env.BETTER_AUTH_SECRET = original;
  }
});
