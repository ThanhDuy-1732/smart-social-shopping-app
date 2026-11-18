import { beforeAll, afterAll, expect, test } from "vitest";
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
import {
  recordLedgerEvent,
  refreshEligibleBalances,
  getShopFinancials,
  prepareSettlement,
  approveSettlement,
  cancelSettlement,
  recordPayout,
} from "@/modules/finance/service";
let f: CommerceFixture;
const proofs: string[] = [];
beforeAll(async () => {
  await prepareDatabase();
  f = await commerceFixture();
});
afterAll(async () => {
  if (f) await cleanupCommerce(f);
  await db.end();
});
async function received(index = 0) {
  const order = await paidOrder(f, index);
  await transitionOrder(order.owner, order.orderId, { type: "accept" });
  await transitionOrder(order.owner, order.orderId, {
    type: "ship",
    carrier: "Hãng thử",
    trackingCode: randomUUID(),
  });
  await transitionOrder(f.buyer, order.orderId, { type: "receive" });
  return order;
}
async function proof() {
  const id = randomUUID();
  proofs.push(id);
  await db.query(
    "INSERT INTO media(id,owner_id,kind,max_bytes,status,mime) VALUES($1,$2,'image',1000,'ready','image/webp')",
    [id, f.admin.userId],
  );
  return id;
}
test("receipt is balanced and idempotent; partial refund yields correct fees and net payout", async () => {
  const order = await received();
  const entries = [
    { account: "cash", amount: 130000n },
    { account: "shop_pending", amount: -130000n },
  ];
  await recordLedgerEvent({
    eventKey: `receipt:${order.orderId}`,
    kind: "receipt",
    orderId: order.orderId,
    entries,
  });
  await expect(
    recordLedgerEvent({
      eventKey: `invalid:${order.orderId}`,
      kind: "receipt",
      orderId: order.orderId,
      entries: [
        { account: "cash", amount: 1n },
        { account: "shop_pending", amount: -2n },
      ],
    }),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  expect(
    (
      await db.query(
        "SELECT count(*)::int AS count FROM ledger_transaction WHERE order_id=$1",
        [order.orderId],
      )
    ).rows[0].count,
  ).toBe(1);
  const detail = await getOrder(f.buyer, order.orderId);
  const c = await requestReturn(f.buyer, {
    orderId: order.orderId,
    items: [{ itemId: detail.items[0].id, quantity: 1 }],
    reason: "Sản phẩm có một phần chưa đúng mô tả",
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
    "UPDATE shop_order SET received_at=now()-interval '8 days' WHERE id=$1",
    [order.orderId],
  );
  await refreshEligibleBalances();
  expect(
    (await getShopFinancials(order.owner, f.products[0].shopId)).eligible,
  ).toBe("78500");
  const settlement = await prepareSettlement(
    f.admin,
    f.products[0].shopId,
    new Date().toISOString(),
  );
  expect(
    (await getShopFinancials(order.owner, f.products[0].shopId)).reserved,
  ).toBe("78500");
  await approveSettlement(f.admin, settlement);
  await recordPayout(
    f.admin,
    settlement,
    await proof(),
    "TEST-" + randomUUID(),
  );
  const balance = await getShopFinancials(order.owner, f.products[0].shopId);
  expect(balance.paid).toBe("78500");
  expect(balance.reserved).toBe("0");
  expect(
    (
      await db.query(
        "SELECT coalesce(sum(e.amount),0)::text AS amount FROM ledger_entry e JOIN ledger_transaction t ON t.id=e.transaction_id WHERE t.order_id=$1 AND e.account='cash'",
        [order.orderId],
      )
    ).rows[0].amount,
  ).toBe("1500");
});
test("concurrent settlement preparation cannot reserve an order twice", async () => {
  const order = await received(1);
  await db.query(
    "UPDATE shop_order SET received_at=now()-interval '8 days' WHERE id=$1",
    [order.orderId],
  );
  const results = await Promise.allSettled([
    prepareSettlement(f.admin, f.products[1].shopId, new Date().toISOString()),
    prepareSettlement(f.admin, f.products[1].shopId, new Date().toISOString()),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const id = (
    results.find(
      (r) => r.status === "fulfilled",
    ) as PromiseFulfilledResult<string>
  ).value;
  await approveSettlement(f.admin, id);
  const originalItems = (
    await db.query(
      "SELECT order_id,amount FROM settlement_item WHERE settlement_id=$1",
      [id],
    )
  ).rows;
  await db.query("DELETE FROM settlement_item WHERE settlement_id=$1", [id]);
  try {
    await expect(
      recordPayout(f.admin, id, await proof(), "TEST-" + randomUUID()),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  } finally {
    for (const item of originalItems)
      await db.query(
        "INSERT INTO settlement_item(settlement_id,order_id,amount) VALUES($1,$2,$3)",
        [id, item.order_id, item.amount],
      );
  }
  await cancelSettlement(f.admin, id, "Hủy đợt thử để kiểm tra trả số dư");
  expect(
    (await getShopFinancials(order.owner, f.products[1].shopId)).reserved,
  ).toBe("0");
  await db.query("DELETE FROM checkout WHERE id=$1", [order.checkoutId]);
});
test("refund approval racing settlement keeps disputed funds out of payout", async () => {
  const order = await received(1);
  const detail = await getOrder(f.buyer, order.orderId);
  const c = await requestReturn(f.buyer, {
    orderId: order.orderId,
    items: [{ itemId: detail.items[0].id, quantity: 1 }],
    reason: "Đề nghị xử lý trước khi đối soát",
  });
  await db.query(
    "UPDATE shop_order SET received_at=now()-interval '8 days' WHERE id=$1",
    [order.orderId],
  );
  const results = await Promise.allSettled([
    prepareSettlement(f.admin, f.products[1].shopId, new Date().toISOString()),
    approveRefund(f.admin, c, 10000n),
  ]);
  expect(results[0].status).toBe("rejected");
  expect(results[1].status).toBe("fulfilled");
  expect(
    (
      await db.query("SELECT payout_status FROM shop_order WHERE id=$1", [
        order.orderId,
      ])
    ).rows[0].payout_status,
  ).toBe("none");
  await expect(
    getShopFinancials(f.other, f.products[1].shopId),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
});

test("payout maintenance switch blocks preparation and approval", async () => {
  process.env.PAYOUT_PAUSED = "true";
  try {
    await expect(
      prepareSettlement(
        f.admin,
        f.products[0].shopId,
        new Date().toISOString(),
      ),
    ).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    await expect(
      approveSettlement(f.admin, randomUUID()),
    ).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
  } finally {
    delete process.env.PAYOUT_PAUSED;
  }
});
