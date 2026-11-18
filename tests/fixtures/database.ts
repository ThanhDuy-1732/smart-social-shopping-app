import { db } from "@/server/db";
import { migrate } from "@/server/migrations";
export async function prepareDatabase() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!url.pathname.endsWith("_test"))
    throw new Error("Integration tests require a dedicated *_test database.");
  await migrate();
}
