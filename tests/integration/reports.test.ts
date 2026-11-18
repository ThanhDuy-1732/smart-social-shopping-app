import { beforeAll, afterAll, test, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/server/db";
import { prepareDatabase } from "../fixtures/database";
import {
  commerceFixture,
  cleanupCommerce,
  paidOrder,
  type CommerceFixture,
} from "../fixtures/commerce";
import { getOrder, transitionOrder } from "@/modules/orders/service";
import {
  requestReturn,
  approveRefund,
  applyVerifiedRefund,
} from "@/modules/returns/service";
import { refreshEligibleBalances } from "@/modules/finance/service";
import {
  getPlatformReport,
  getShopReport,
  vietnamRange,
  csvCell,
  trackActivity,
} from "@/modules/reporting/service";
import { createPost } from "@/modules/social/service";
let f: CommerceFixture;
beforeAll(async () => {
  await prepareDatabase();
  f = await commerceFixture();
});
afterAll(async () => {
  if (f) await cleanupCommerce(f);
  await db.end();
});
test("Vietnam ranges validate dates and CSV cannot execute formulas", () => {
  expect(vietnamRange({ from: "2088-02-01", to: "2088-02-01" })).toEqual({
    start: "2088-01-31T17:00:00.000Z",
    end: "2088-02-01T17:00:00.000Z",
  });
  expect(() =>
    vietnamRange({ from: "2026-02-30", to: "2026-03-01" }),
  ).toThrow();
  expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
});
test("paid GMV, receipts, refund, earned fee and shop payable reconcile independently", async () => {
  const order = await paidOrder(f);
  await transitionOrder(order.owner, order.orderId, { type: "accept" });
  await transitionOrder(order.owner, order.orderId, {
    type: "ship",
    carrier: "Hãng thử",
    trackingCode: randomUUID(),
  });
  await transitionOrder(f.buyer, order.orderId, { type: "receive" });
  const detail = await getOrder(f.buyer, order.orderId);
  const c = await requestReturn(f.buyer, {
    orderId: order.orderId,
    items: [{ itemId: detail.items[0].id, quantity: 1 }],
    reason: "Một phần sản phẩm chưa đúng mô tả",
  });
  const refund = await approveRefund(f.admin, c, 50000n);
  await applyVerifiedRefund({
    refundId: refund,
    providerReference: randomUUID(),
    amount: "50000",
    currency: "VND",
    status: "succeeded",
  });
  await db.query(
    "UPDATE shop_order SET received_at=now()-interval '8 days',paid_at='2088-01-31T17:00:00Z' WHERE id=$1",
    [order.orderId],
  );
  await refreshEligibleBalances();
  await db.query(
    "UPDATE ledger_transaction SET created_at='2088-01-31T17:00:00Z' WHERE order_id=$1",
    [order.orderId],
  );
  const range = { from: "2088-02-01", to: "2088-02-01" };
  const report = await getShopReport(order.owner, f.products[0].shopId, range);
  expect(report.paidGmv).toBe("100000");
  expect(report.receipts).toBe("130000");
  expect(report.refunds).toBe("50000");
  expect(report.fees).toBe("1500");
  expect(report.payable).toBe("78500");
  expect(report.payouts).toBe("0");
  expect(report.netCash).toBe("80000");
  expect((await getPlatformReport(f.admin, range)).fees).toBe("1500");
  await expect(
    getShopReport(f.other, f.products[0].shopId, range),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  await expect(getPlatformReport(order.owner, range)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
});
test("attribution uses visible server-verified post linkage and view retries are deduplicated", async () => {
  const product = f.products[1];
  const id = await createPost(f.other, {
    text: "Trải nghiệm món đang dùng hằng ngày",
    mediaIds: [],
    productIds: [product.productId],
    topics: [],
  });
  await trackActivity(f.buyer, { kind: "post", targetId: id });
  await trackActivity(f.buyer, { kind: "post", targetId: id });
  expect(
    (
      await db.query(
        "SELECT count(*)::int AS n FROM activity_event WHERE user_id=$1 AND kind='post' AND target_id=$2",
        [f.buyer.userId, id],
      )
    ).rows[0].n,
  ).toBe(1);
  const order = await paidOrder(f, 1);
  expect(
    (
      await db.query(
        "SELECT source_kind,source_id FROM shop_order WHERE id=$1",
        [order.orderId],
      )
    ).rows[0],
  ).toMatchObject({ source_kind: "post", source_id: id });
});

test("a hidden source never gets credited on a new order", async () => {
  const p = f.products[1];
  const post = await createPost(f.other, {
    text: "Bài tạm ẩn trước khi tạo đơn mới",
    mediaIds: [],
    productIds: [p.productId],
    topics: [],
  });
  await trackActivity(f.buyer, { kind: "post", targetId: post });
  await db.query("UPDATE social_post SET status='hidden' WHERE id=$1", [post]);
  const order = await paidOrder(f, 1);
  expect(
    (
      await db.query("SELECT source_kind FROM shop_order WHERE id=$1", [
        order.orderId,
      ])
    ).rows[0].source_kind,
  ).toBe("direct");
});
