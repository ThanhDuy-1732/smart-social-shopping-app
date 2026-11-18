import { beforeAll, afterAll, test, expect } from "vitest";
import { readFile, rm } from "node:fs/promises";
import { db, withTransaction } from "@/server/db";
import { prepareDatabase } from "../fixtures/database";
import { createAccount } from "../fixtures/accounts";
import { notifyUser } from "@/modules/notifications/service";
import { workEmailOnce } from "@/server/email-outbox";
import type { Actor } from "@/modules/shared/types";
let actor: Actor, mailId: string;
beforeAll(async () => {
  await prepareDatabase();
  actor = await createAccount();
});
afterAll(async () => {
  if (mailId) await rm(`.local/mail/${mailId}.json`, { force: true });
  if (actor) await db.query('DELETE FROM "user" WHERE id=$1', [actor.userId]);
  await db.end();
});
test("transaction rollback and retries do not duplicate transactional email", async () => {
  await expect(
    withTransaction(async (c) => {
      await notifyUser(
        actor.userId,
        {
          eventKey: "rollback",
          title: "Đơn hàng đã cập nhật",
          href: "/orders",
          email: true,
        },
        c,
      );
      throw new Error("rollback");
    }),
  ).rejects.toThrow("rollback");
  expect(
    (
      await db.query("SELECT 1 FROM email_outbox WHERE user_id=$1", [
        actor.userId,
      ])
    ).rowCount,
  ).toBe(0);
  for (let i = 0; i < 2; i++)
    await withTransaction((c) =>
      notifyUser(
        actor.userId,
        {
          eventKey: "one",
          title: "Đơn hàng đã cập nhật",
          href: "/orders",
          email: true,
        },
        c,
      ),
    );
  const rows = (
    await db.query("SELECT id FROM email_outbox WHERE user_id=$1", [
      actor.userId,
    ])
  ).rows;
  expect(rows).toHaveLength(1);
  mailId = rows[0].id;
  await db.query("UPDATE background_job SET available_at='2000-01-01' WHERE kind='email.send' AND key=$1",[mailId]);
  for (let i = 0; i < 2; i++) {
    if (
      (await db.query("SELECT status FROM email_outbox WHERE id=$1", [mailId]))
        .rows[0].status === "sent"
    )
      break;
    await workEmailOnce();
  }
  const email = JSON.parse(
    await readFile(`.local/mail/${mailId}.json`, "utf8"),
  );
  expect(email.text).toContain("/orders");
  expect(
    (await db.query("SELECT status FROM email_outbox WHERE id=$1", [mailId]))
      .rows[0].status,
  ).toBe("sent");
});
