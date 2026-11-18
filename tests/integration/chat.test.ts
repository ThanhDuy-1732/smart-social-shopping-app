import { beforeAll, afterAll, expect, test } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/server/db";
import { prepareDatabase } from "../fixtures/database";
import { createAccount } from "../fixtures/accounts";
import {
  commerceFixture,
  cleanupCommerce,
  paidOrder,
} from "../fixtures/commerce";
import {
  openConversation,
  sendMessage,
  listMessages,
  getConversation,
  markRead,
  listConversations,
} from "@/modules/chat/service";
import { interact } from "@/modules/social/service";
import type { Actor } from "@/modules/shared/types";
let a: Actor, b: Actor, other: Actor, conversationId: string;
beforeAll(async () => {
  await prepareDatabase();
  a = await createAccount();
  b = await createAccount();
  other = await createAccount();
});
afterAll(async () => {
  for (const actor of [a, b, other])
    if (actor) await db.query('DELETE FROM "user" WHERE id=$1', [actor.userId]);
  await db.end();
});
test("one private conversation per pair and outsiders cannot read or send", async () => {
  conversationId = await openConversation(a, b.userId);
  expect(await openConversation(b, a.userId)).toBe(conversationId);
  await expect(listMessages(other, conversationId)).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  await expect(
    sendMessage(
      other,
      { conversationId, text: "Không được gửi" },
      randomUUID(),
    ),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
});
test("retries do not duplicate messages or notifications and unread changes on read", async () => {
  const key = randomUUID();
  const id = await sendMessage(
    a,
    { conversationId, text: "Xin chào, mình muốn hỏi về sản phẩm." },
    key,
  );
  expect(
    await sendMessage(
      a,
      { conversationId, text: "Xin chào, mình muốn hỏi về sản phẩm." },
      key,
    ),
  ).toBe(id);
  await expect(
    sendMessage(a, { conversationId, text: "Nội dung khác" }, key),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  const page = await listMessages(b, conversationId);
  expect(page.items).toHaveLength(1);
  expect((await listConversations(b))[0].unread).toBe(1);
  await markRead(b, conversationId, page.items[0].position);
  expect((await listConversations(b))[0].unread).toBe(0);
  expect((await getConversation(a, conversationId)).peerRead).toBe("1");
  expect(
    (
      await db.query(
        "SELECT count(*)::int AS count FROM notification WHERE user_id=$1",
        [b.userId],
      )
    ).rows[0].count,
  ).toBe(1);
});
test("order cards require both participants to be parties to that order", async () => {
  const f = await commerceFixture();
  try {
    const order = await paidOrder(f);
    await expect(
      sendMessage(
        a,
        { conversationId, reference: { kind: "order", id: order.orderId } },
        randomUUID(),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const room = await openConversation(f.buyer, order.owner.userId);
    await sendMessage(
      f.buyer,
      { conversationId: room, reference: { kind: "order", id: order.orderId } },
      randomUUID(),
    );
    const page = await listMessages(order.owner, room);
    expect(page.items[0].reference?.kind).toBe("order");
    expect(JSON.stringify(page.items)).not.toContain("12 đường A");
  } finally {
    await cleanupCommerce(f);
  }
});
test("blocking prevents new messages and preserves private history", async () => {
  await interact(a, { type: "block", targetId: b.userId, enabled: true });
  await expect(
    sendMessage(
      b,
      { conversationId, text: "Không được gửi sau khi chặn" },
      randomUUID(),
    ),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect((await listMessages(b, conversationId)).items).toHaveLength(1);
  expect((await getConversation(b, conversationId)).blocked).toBe(true);
});
test("notification ownership, quota rollover, and message reports are scoped", async () => {
  const { markNotificationRead, listNotifications } =
    await import("@/modules/notifications/service");
  const { consumeQuota } = await import("@/server/quota");
  const { reportContent, listReports } =
    await import("@/modules/moderation/service");
  const notices = await listNotifications(b);
  await expect(
    markNotificationRead(other, notices[0].id),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  await markNotificationRead(b, notices[0].id);
  await consumeQuota(other.userId, "message", 2, 60);
  await consumeQuota(other.userId, "message", 2, 60);
  await expect(
    consumeQuota(other.userId, "message", 2, 60),
  ).rejects.toMatchObject({ code: "RATE_LIMITED" });
  await db.query(
    "UPDATE quota_bucket SET expires_at=now()-interval '1 second' WHERE user_id=$1",
    [other.userId],
  );
  await consumeQuota(other.userId, "message", 2, 60);
  const message = (await listMessages(b, conversationId)).items[0];
  await expect(
    reportContent(other, {
      kind: "message",
      targetId: message.id,
      reason: "Nội dung cần kiểm tra lại",
    }),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  const report = await reportContent(b, {
    kind: "message",
    targetId: message.id,
    reason: "Nội dung cần kiểm tra lại",
  });
  expect(report).toBeTruthy();
  await expect(listReports(other)).rejects.toMatchObject({ code: "FORBIDDEN" });
});
