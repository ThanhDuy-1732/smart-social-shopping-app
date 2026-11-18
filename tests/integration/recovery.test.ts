import { beforeAll, afterAll, test, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { Pool } from "pg";
import { db } from "@/server/db";
import { prepareDatabase } from "../fixtures/database";
import {
  commerceFixture,
  cleanupCommerce,
  paidOrder,
  type CommerceFixture,
} from "../fixtures/commerce";
import { backupDatabase, restoreTestBackup } from "../../scripts/backup";
let f: CommerceFixture;
beforeAll(async () => {
  await prepareDatabase();
  f = await commerceFixture();
});
afterAll(async () => {
  if (f) await cleanupCommerce(f);
  await db.end();
});
test("native PostgreSQL backup restores schema, business rows and balanced ledger to an isolated database", async () => {
  const order = await paidOrder(f),
    name = `recovery_${randomUUID().replaceAll("-", "")}_restore_test`,
    file = `.local/backups/${randomUUID()}.dump`,
    source = process.env.DATABASE_URL!,
    target = new URL(source);
  target.pathname = "/" + name;
  let created = false,
    restored: Pool | undefined;
  try {
    await backupDatabase(source, file);
    await db.query(`CREATE DATABASE "${name}"`);
    created = true;
    await restoreTestBackup(target.toString(), file);
    restored = new Pool({ connectionString: target.toString() });
    expect(
      (
        await restored.query("SELECT status FROM shop_order WHERE id=$1", [
          order.orderId,
        ])
      ).rows[0].status,
    ).toBe("paid");
    expect(
      (
        await restored.query(
          "SELECT coalesce(sum(e.amount),0)::text AS balance FROM ledger_entry e JOIN ledger_transaction t ON t.id=e.transaction_id WHERE t.order_id=$1",
          [order.orderId],
        )
      ).rows[0].balance,
    ).toBe("0");
    expect(
      (await restored.query("SELECT count(*)::int AS n FROM schema_migrations"))
        .rows[0].n,
    ).toBe(
      (await db.query("SELECT count(*)::int AS n FROM schema_migrations"))
        .rows[0].n,
    );
    expect(
      (await restored.query("SELECT count(*)::int AS n FROM notification"))
        .rows[0].n,
    ).toBe(
      (await db.query("SELECT count(*)::int AS n FROM notification")).rows[0].n,
    );
  } finally {
    await restored?.end();
    if (created) await db.query(`DROP DATABASE "${name}"`);
    await rm(file, { force: true });
  }
}, 30000);
test("automated restore refuses a non-test target", async () => {
  await expect(
    restoreTestBackup(process.env.DATABASE_URL!, "anything.dump"),
  ).rejects.toThrow("restore_test");
});
