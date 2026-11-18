import { beforeAll, afterAll, expect, test, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/server/db";
import { prepareDatabase } from "../fixtures/database";
import {
  commerceFixture,
  cleanupCommerce,
  paidOrder,
  type CommerceFixture,
} from "../fixtures/commerce";
import { transitionOrder, getOrder } from "@/modules/orders/service";
import {
  requestReturn,
  approveRefund,
  applyVerifiedRefund,
} from "@/modules/returns/service";
import { submitReview } from "@/modules/reviews/service";
let f: CommerceFixture, receivedId: string;
beforeAll(async () => {
  await prepareDatabase();
  f = await commerceFixture();
});
afterAll(async () => {
  if (f) await cleanupCommerce(f);
  await db.end();
});
async function receive(index = 0) {
  const order = await paidOrder(f, index);
  await transitionOrder(order.owner, order.orderId, { type: "accept" });
  await transitionOrder(order.owner, order.orderId, {
    type: "ship",
    carrier: "Hãng giao thử",
    trackingCode: "TRACK-123",
  });
  await transitionOrder(f.buyer, order.orderId, { type: "receive" });
  return order;
}
test("seller can ship own order but tracking alone never confirms receipt", async () => {
  const order = await paidOrder(f);
  await expect(
    transitionOrder(f.other, order.orderId, { type: "accept" }),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  await transitionOrder(order.owner, order.orderId, { type: "accept" });
  await transitionOrder(order.owner, order.orderId, {
    type: "ship",
    carrier: "Hãng giao thử",
    trackingCode: "TRACK-123",
  });
  const detail = await getOrder(f.buyer, order.orderId);
  expect(detail.status).toBe("shipped");
  expect(detail.receivedAt).toBeNull();
  await expect(
    transitionOrder(order.owner, order.orderId, { type: "receive" }),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  await transitionOrder(f.buyer, order.orderId, { type: "receive" });
  receivedId = order.orderId;
});
test("partial refunds are bounded, remain pending until verified and apply only once", async () => {
  const { orderId: receivedId } = await receive();
  const detail = await getOrder(f.buyer, receivedId);
  const caseId = await requestReturn(f.buyer, {
    orderId: receivedId,
    items: [{ itemId: detail.items[0].id, quantity: 1 }],
    reason: "Sản phẩm không đúng mô tả đã công bố",
    evidenceIds: [],
  });
  await expect(approveRefund(f.other, caseId, 50000n)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
  await expect(approveRefund(f.admin, caseId, 200000n)).rejects.toMatchObject({
    code: "INVALID_INPUT",
  });
  const refundId = await approveRefund(f.admin, caseId, 50000n);
  expect(
    (await db.query("SELECT status FROM refund WHERE id=$1", [refundId]))
      .rows[0].status,
  ).toBe("pending");
  const event = {
    refundId,
    providerReference: randomUUID(),
    amount: "50000",
    currency: "VND",
    status: "succeeded",
  };
  await applyVerifiedRefund(event);
  await applyVerifiedRefund(event);
  expect(
    (
      await db.query(
        "SELECT refunded_amount::text FROM shop_order WHERE id=$1",
        [receivedId],
      )
    ).rows[0].refunded_amount,
  ).toBe("50000");
  await expect(
    requestReturn(f.buyer, {
      orderId: receivedId,
      items: [{ itemId: detail.items[0].id, quantity: 2 }],
      reason: "Yêu cầu vượt số lượng mua ban đầu",
    }),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
});
test("only buyer after receipt can leave a verified purchase review", async () => {
  const { orderId: receivedId } = await receive();
  const order = await getOrder(f.buyer, receivedId);
  await expect(
    submitReview(f.other, order.items[0].id, { rating: 5, text: "Rất tốt" }),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  await submitReview(f.buyer, order.items[0].id, {
    rating: 4,
    text: "Đánh giá từ trải nghiệm nhận hàng.",
  });
  await expect(
    submitReview(f.buyer, order.items[0].id, {
      rating: 3,
      text: "Đánh giá trùng",
    }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
});
test("open case may be requested but refund is blocked during a payout reservation", async () => {
  const order = await receive();
  const detail = await getOrder(f.buyer, order.orderId);
  const caseId = await requestReturn(f.buyer, {
    orderId: order.orderId,
    items: [{ itemId: detail.items[0].id, quantity: 1 }],
    reason: "Đề nghị kiểm tra lại chất lượng hàng",
  });
  await db.query("UPDATE shop_order SET payout_status='reserved' WHERE id=$1", [
    order.orderId,
  ]);
  await expect(approveRefund(f.admin, caseId, 10000n)).rejects.toMatchObject({
    code: "CONFLICT",
  });
});

test("return evidence is private to the parties and audited staff access", async () => {
  const { requestUpload, completeUpload, workMediaOnce, readMedia } =
    await import("@/modules/media/service");
  const sharp = (await import("sharp")).default;
  const order = await receive();
  const detail = await getOrder(f.buyer, order.orderId);
  const ticket = await requestUpload(f.buyer, { kind: "image", size: 1000 });
  try {
    const bytes = await sharp({
      create: { width: 8, height: 8, channels: 3, background: "#2455d6" },
    })
      .png()
      .toBuffer();
    await completeUpload(f.buyer, ticket.id, bytes);
    await workMediaOnce();
    await requestReturn(f.buyer, {
      orderId: order.orderId,
      items: [{ itemId: detail.items[0].id, quantity: 1 }],
      reason: "Bằng chứng hàng giao không đúng mô tả",
      evidenceIds: [ticket.id],
    });
    expect((await readMedia(order.owner, ticket.id)).mime).toBe("image/webp");
    await expect(readMedia(f.other, ticket.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(readMedia(null, ticket.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await readMedia(f.admin, ticket.id);
    expect(
      (
        await db.query(
          "SELECT 1 FROM audit_event WHERE action='evidence.read' AND actor_id=$1 AND target_id=$2",
          [f.admin.userId, ticket.id],
        )
      ).rowCount,
    ).toBe(1);
  } finally {
    const { rm } = await import("node:fs/promises");
    await rm(`.local/storage/${ticket.id}`, { recursive: true, force: true });
    await db.query(
      "DELETE FROM background_job WHERE kind='media.process' AND key=$1",
      [ticket.id],
    );
  }
});

test("return deadline uses database time even when the application clock is behind", async () => {
  const order = await receive(1);
  const detail = await getOrder(f.buyer, order.orderId);
  await db.query(
    "UPDATE shop_order SET received_at=now()-interval '8 days' WHERE id=$1",
    [order.orderId],
  );
  vi.spyOn(Date, "now").mockReturnValue(Date.now() - 20 * 86400000);
  try {
    await expect(
      requestReturn(f.buyer, {
        orderId: order.orderId,
        items: [{ itemId: detail.items[0].id, quantity: 1 }],
        reason: "Yêu cầu sau khi hết thời hạn đổi trả",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  } finally {
    vi.restoreAllMocks();
  }
});
