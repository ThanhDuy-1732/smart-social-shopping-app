import { beforeAll, afterAll, test, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/server/db";
import { prepareDatabase } from "../fixtures/database";
import { createAccount } from "../fixtures/accounts";
import { subscribePush, unsubscribePush } from "@/modules/notifications/push";
import type { Actor } from "@/modules/shared/types";
let actor: Actor, other: Actor, sessionId: string;
beforeAll(async () => {
  await prepareDatabase();
  actor = await createAccount();
  other = await createAccount();
  sessionId = randomUUID();
  await db.query(
    'INSERT INTO session(id,token,"userId","expiresAt","createdAt","updatedAt") VALUES($1,$2,$3,now()+interval \'1 day\',now(),now())',
    [sessionId, randomUUID(), actor.userId],
  );
});
afterAll(async () => {
  for (const a of [actor, other])
    if (a) await db.query('DELETE FROM "user" WHERE id=$1', [a.userId]);
  await db.end();
});
test("unconfigured push fails closed and invalid destinations cannot be stored", async () => {
  await expect(
    subscribePush(
      actor,
      { endpoint: "https://127.0.0.1/private", keys: {} },
      sessionId,
    ),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
});
test("subscription belongs to one live session and is removed when that session ends", async () => {
  const endpoint = "https://fcm.googleapis.com/fcm/send/" + randomUUID();
  const subscription = {
    endpoint,
    keys: {
      p256dh: Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 1)]).toString(
        "base64url",
      ),
      auth: Buffer.alloc(16, 1).toString("base64url"),
    },
  };
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "fixture-public";
  process.env.VAPID_PRIVATE_KEY = "fixture-private";
  process.env.VAPID_SUBJECT = "mailto:fixture@example.test";
  try {
    await expect(
      subscribePush(other, subscription, sessionId),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await subscribePush(actor, subscription, sessionId);
    await unsubscribePush(other, endpoint);
    expect(
      (
        await db.query("SELECT 1 FROM push_subscription WHERE endpoint=$1", [
          endpoint,
        ])
      ).rowCount,
    ).toBe(1);
    await db.query("DELETE FROM session WHERE id=$1", [sessionId]);
    expect(
      (
        await db.query("SELECT 1 FROM push_subscription WHERE endpoint=$1", [
          endpoint,
        ])
      ).rowCount,
    ).toBe(0);
  } finally {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
  }
});
