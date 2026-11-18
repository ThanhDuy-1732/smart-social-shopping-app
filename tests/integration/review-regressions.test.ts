import {
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  test,
  expect,
} from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/server/db";
import { prepareDatabase } from "../fixtures/database";
import {
  commerceFixture,
  cleanupCommerce,
  paidOrder,
  type CommerceFixture,
} from "../fixtures/commerce";
import { getOwnProduct } from "@/modules/catalog/queries";
import { saveProduct, publishProduct } from "@/modules/catalog/service";
import { transitionOrder } from "@/modules/orders/service";
import { rejectReturn } from "@/modules/returns/service";
import {
  setCartItem,
  quoteCart,
  createCheckout,
} from "@/modules/checkout/service";
import { setShippingRate } from "@/modules/shipping/service";
import { applyVerifiedPaymentEvent } from "@/modules/payments/service";
import {
  refreshEligibleBalances,
  prepareSettlement,
} from "@/modules/finance/service";
import {
  openConversation,
  listMessages,
  sendMessage,
} from "@/modules/chat/service";
import { reportContent, listReports } from "@/modules/moderation/service";
let f: CommerceFixture;
beforeAll(prepareDatabase);
beforeEach(async () => {
  f = await commerceFixture();
});
afterEach(async () => {
  if (f) await cleanupCommerce(f);
});
afterAll(() => db.end());
test("stale product editor preserves stock for description edits and rejects stale explicit stock changes", async () => {
  const p = f.products[0],
    snapshot = (await getOwnProduct(p.owner, p.productId))!;
  const input = {
    ...snapshot,
    shopId: p.shopId,
    variants: snapshot.variants.map((v) => ({ ...v, originalStock: v.stock })),
  };
  await paidOrder(f);
  await saveProduct(p.owner, {
    ...input,
    description: "Mô tả đã được cập nhật sau khi có đơn.",
  });
  expect(
    (
      await db.query("SELECT stock FROM product_variant WHERE id=$1", [
        p.variantId,
      ])
    ).rows[0].stock,
  ).toBe(4);
  await expect(
    saveProduct(p.owner, {
      ...input,
      variants: input.variants.map((v) => ({ ...v, stock: v.stock + 2 })),
    }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  await publishProduct(f.admin, p.productId);
});
test("paid cancellation restores only its stock once and its mandatory refund cannot be rejected", async () => {
  const order = await paidOrder(f);
  const variant = f.products[0].variantId;
  const before = (
    await db.query("SELECT stock FROM product_variant WHERE id=$1", [variant])
  ).rows[0].stock;
  await transitionOrder(f.buyer, order.orderId, {
    type: "cancel",
    reason: "Người mua hủy trước khi giao hàng",
  });
  await transitionOrder(f.buyer, order.orderId, {
    type: "cancel",
    reason: "Người mua gửi lại yêu cầu hủy đơn",
  });
  expect(
    (await db.query("SELECT stock FROM product_variant WHERE id=$1", [variant]))
      .rows[0].stock,
  ).toBe(before + 1);
  const c = (
    await db.query("SELECT id FROM return_case WHERE order_id=$1", [
      order.orderId,
    ])
  ).rows[0];
  await expect(
    rejectReturn(f.admin, c.id, "Không thể từ chối nghĩa vụ hoàn tiền"),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  expect(
    (await db.query("SELECT status FROM return_case WHERE id=$1", [c.id]))
      .rows[0].status,
  ).toBe("open");
});
test("failed payment releases stock; a late paid event cannot take another buyer reservation or dismiss its refund", async () => {
  const p = f.products[0],
    address = {
      name: "Người thử",
      phone: "0901234567",
      region: "Hà Nội",
      line: "12 đường thử, Hà Nội",
    };
  await setShippingRate(p.owner, p.shopId, {
    region: "*",
    fee: "30000",
    estimatedDays: 3,
  });
  await setCartItem(f.buyer, p.variantId, 1);
  const q = await quoteCart(f.buyer, { region: "Hà Nội" }),
    checkout = await createCheckout(
      f.buyer,
      { address, quoteToken: q.token },
      randomUUID(),
    ),
    paymentId = randomUUID();
  await db.query(
    "INSERT INTO payment_intent(id,checkout_id,provider_reference,amount,currency) VALUES($1,$2,$1,$3,'VND')",
    [paymentId, checkout.id, checkout.total],
  );
  const event = {
    eventId: randomUUID(),
    providerReference: paymentId,
    amount: checkout.total,
    currency: "VND",
    status: "failed",
  };
  await applyVerifiedPaymentEvent(event);
  await applyVerifiedPaymentEvent(event);
  expect(
    (
      await db.query(
        "SELECT count(*)::int AS n FROM inventory_reservation WHERE checkout_id=$1 AND status='held'",
        [checkout.id],
      )
    ).rows[0].n,
  ).toBe(0);
  expect(
    (await db.query("SELECT status FROM checkout WHERE id=$1", [checkout.id]))
      .rows[0].status,
  ).toBe("expired");
  await setCartItem(f.other, p.variantId, 5);
  const other = await quoteCart(f.other, { region: "Hà Nội" });
  await createCheckout(
    f.other,
    { address, quoteToken: other.token },
    randomUUID(),
  );
  await applyVerifiedPaymentEvent({
    ...event,
    eventId: randomUUID(),
    status: "paid",
  });
  expect(
    (await db.query("SELECT status FROM checkout WHERE id=$1", [checkout.id]))
      .rows[0].status,
  ).toBe("refund_required");
  const c = (
    await db.query(
      "SELECT r.id FROM return_case r JOIN shop_order o ON o.id=r.order_id WHERE o.checkout_id=$1",
      [checkout.id],
    )
  ).rows[0];
  await expect(
    rejectReturn(f.admin, c.id, "Khoản thu đã nhận phải được hoàn trả"),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  expect(
    (
      await db.query("SELECT stock,reserved FROM product_variant WHERE id=$1", [
        p.variantId,
      ])
    ).rows[0],
  ).toEqual({ stock: 5, reserved: 5 });
});
test("a historical cutoff excludes orders that matured after it even if the worker has recognized them", async () => {
  const order = await paidOrder(f);
  await transitionOrder(order.owner, order.orderId, { type: "accept" });
  await transitionOrder(order.owner, order.orderId, {
    type: "ship",
    carrier: "Hãng thử",
    trackingCode: randomUUID(),
  });
  await transitionOrder(f.buyer, order.orderId, { type: "receive" });
  await db.query(
    "UPDATE shop_order SET created_at=now()-interval '10 days',received_at=now()-interval '7 days 12 hours' WHERE id=$1",
    [order.orderId],
  );
  await refreshEligibleBalances();
  await expect(
    prepareSettlement(
      f.admin,
      f.products[0].shopId,
      new Date(Date.now() - 86400000).toISOString(),
    ),
  ).rejects.toMatchObject({ code: "CONFLICT" });
});
test("numeric chat pagination retrieves every message across three pages", async () => {
  const room = await openConversation(f.buyer, f.other.userId);
  for (let i = 1; i <= 110; i++)
    await db.query(
      "INSERT INTO chat_message(id,conversation_id,sender_id,position,text,client_message_id,payload_hash) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [
        randomUUID(),
        room,
        f.buyer.userId,
        i,
        `Tin ${i}`,
        randomUUID(),
        "fixture",
      ],
    );
  await db.query("UPDATE conversation SET counter=110 WHERE id=$1", [room]);
  const a = await listMessages(f.other, room),
    b = await listMessages(f.other, room, a.nextCursor!),
    c = await listMessages(f.other, room, b.nextCursor!);
  expect(a.items.map((m) => Number(m.position))).toEqual(
    Array.from({ length: 50 }, (_, i) => i + 61),
  );
  expect(
    [...c.items, ...b.items, ...a.items].map((m) => Number(m.position)),
  ).toEqual(Array.from({ length: 110 }, (_, i) => i + 1));
});
test("disclosing a reported private message records an evidence access", async () => {
  const room = await openConversation(f.buyer, f.other.userId),
    message = await sendMessage(
      f.buyer,
      { conversationId: room, text: "Nội dung riêng được báo cáo để kiểm tra" },
      randomUUID(),
    );
  await reportContent(f.other, {
    kind: "message",
    targetId: message,
    reason: "Đề nghị kiểm tra tin nhắn được báo cáo",
  });
  expect(
    (await listReports(f.admin)).find((r) => r.targetId === message)?.preview,
  ).toContain("Nội dung riêng");
  expect(
    (
      await db.query(
        "SELECT 1 FROM audit_event WHERE actor_id=$1 AND target_id=$2 AND action='evidence.read'",
        [f.admin.userId, message],
      )
    ).rowCount,
  ).toBe(1);
});
test("a mandatory cancellation refund cannot be rejected through the support service", async () => {
  const order = await paidOrder(f);
  await transitionOrder(f.buyer, order.orderId, {
    type: "cancel",
    reason: "Khách hủy trước khi shop xác nhận",
  });
  const c = (
    await db.query("SELECT id FROM return_case WHERE order_id=$1", [
      order.orderId,
    ])
  ).rows[0];
  await expect(
    rejectReturn(f.admin, c.id, "Từ chối yêu cầu nhưng tiền đã thu"),
  ).rejects.toMatchObject({ code: "CONFLICT" });
});
