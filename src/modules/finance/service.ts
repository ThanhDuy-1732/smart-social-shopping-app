import { z } from "zod";
import { randomUUID, createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { db, withTransaction } from "@/server/db";
import { assertActiveActor, requirePermission } from "@/modules/access/service";
import { getReadyMedia } from "@/modules/media/service";
import { DomainError, type Actor } from "@/modules/shared/types";
import { lockShopFinance } from "./lock";
function assertPayoutOpen() {
  if (process.env.PAYOUT_PAUSED && process.env.PAYOUT_PAUSED !== "false")
    throw new DomainError(
      "PROVIDER_UNAVAILABLE",
      "Chi trả đang tạm dừng để kiểm tra đối soát.",
    );
}
export type LedgerEvent = {
  eventKey: string;
  kind: string;
  orderId: string;
  entries: { account: string; amount: bigint }[];
};
const accounts = [
  "cash",
  "shop_pending",
  "shop_eligible",
  "shop_reserved",
  "platform_fee",
];
export const roundFee = (amount: bigint, bps: number) =>
  (amount * BigInt(bps) + 5000n) / 10000n;
export async function recordLedgerEvent(
  input: LedgerEvent,
  client?: PoolClient,
): Promise<void> {
  if (
    !input.eventKey ||
    !z.uuid().safeParse(input.orderId).success ||
    input.entries.length < 2 ||
    input.entries.length > 5 ||
    new Set(input.entries.map((x) => x.account)).size !==
      input.entries.length ||
    input.entries.some(
      (x) =>
        !accounts.includes(x.account) ||
        typeof x.amount !== "bigint" ||
        x.amount === 0n,
    ) ||
    input.entries.reduce((sum, x) => sum + x.amount, 0n) !== 0n
  )
    throw new DomainError(
      "INVALID_INPUT",
      "Bút toán phải cân đối và có tài khoản hợp lệ.",
    );
  const sorted = input.entries
    .map((x) => ({ account: x.account, amount: x.amount.toString() }))
    .sort((a, b) => a.account.localeCompare(b.account));
  const digest = createHash("sha256")
    .update(
      JSON.stringify({
        kind: input.kind,
        orderId: input.orderId,
        entries: sorted,
      }),
    )
    .digest("hex");
  async function insert(c: PoolClient) {
    const id = randomUUID();
    const inserted = await c.query(
      "INSERT INTO ledger_transaction(id,event_key,kind,order_id,payload_hash) VALUES($1,$2,$3,$4,$5) ON CONFLICT(event_key) DO NOTHING RETURNING id",
      [id, input.eventKey, input.kind, input.orderId, digest],
    );
    if (!inserted.rowCount) {
      const old = (
        await c.query(
          "SELECT payload_hash FROM ledger_transaction WHERE event_key=$1",
          [input.eventKey],
        )
      ).rows[0];
      if (old?.payload_hash !== digest)
        throw new DomainError(
          "CONFLICT",
          "Sự kiện tài chính đã được ghi với nội dung khác.",
        );
      return;
    }
    for (const e of sorted)
      await c.query(
        "INSERT INTO ledger_entry(transaction_id,account,amount) VALUES($1,$2,$3)",
        [id, e.account, e.amount],
      );
  }
  if (client) await insert(client);
  else await withTransaction(insert);
}
export async function recordPaymentReceipt(
  client: PoolClient,
  checkoutId: string,
): Promise<void> {
  const orders = (
    await client.query(
      "SELECT id,subtotal,shipping FROM shop_order WHERE checkout_id=$1 ORDER BY id",
      [checkoutId],
    )
  ).rows;
  for (const o of orders) {
    const amount = BigInt(o.subtotal) + BigInt(o.shipping);
    await recordLedgerEvent(
      {
        eventKey: `receipt:${o.id}`,
        kind: "receipt",
        orderId: o.id,
        entries: [
          { account: "cash", amount },
          { account: "shop_pending", amount: -amount },
        ],
      },
      client,
    );
  }
}
export async function recordConfirmedRefund(
  client: PoolClient,
  orderId: string,
  refundId: string,
  amount: bigint,
  itemAmount: bigint,
): Promise<void> {
  const order = (
    await client.query("SELECT * FROM shop_order WHERE id=$1", [orderId])
  ).rows[0];
  const entries = [{ account: "cash", amount: -amount }];
  if (order.finance_eligible) {
    const fee = roundFee(
      BigInt(order.subtotal) - BigInt(order.refunded_items_amount) - itemAmount,
      order.commission_bps,
    );
    const feeReturn = BigInt(order.fee_amount) - fee;
    const net = amount - feeReturn;
    if (net) entries.push({ account: "shop_eligible", amount: net });
    if (feeReturn) entries.push({ account: "platform_fee", amount: feeReturn });
    await client.query("UPDATE shop_order SET fee_amount=$2 WHERE id=$1", [
      orderId,
      fee.toString(),
    ]);
  } else entries.push({ account: "shop_pending", amount });
  await recordLedgerEvent(
    { eventKey: `refund:${refundId}`, kind: "refund", orderId, entries },
    client,
  );
}
async function recognizeEligible(
  client: PoolClient,
  shopId: string,
  cutoff: string,
): Promise<number> {
  const rows = (
    await client.query(
      "SELECT o.* FROM shop_order o WHERE o.shop_id=$1 AND o.status='received' AND o.finance_eligible=false AND o.received_at+make_interval(days=>greatest((o.policy_snapshot->>'returnDays')::int,(o.policy_snapshot->>'settlementHoldDays')::int))<$2::timestamptz AND NOT EXISTS(SELECT 1 FROM return_case c WHERE c.order_id=o.id AND c.status IN ('open','refund_pending')) ORDER BY o.id FOR UPDATE",
      [shopId, cutoff],
    )
  ).rows;
  for (const o of rows) {
    const gross =
        BigInt(o.subtotal) + BigInt(o.shipping) - BigInt(o.refunded_amount),
      fee = roundFee(
        BigInt(o.subtotal) - BigInt(o.refunded_items_amount),
        o.commission_bps,
      ),
      net = gross - fee;
    if (gross) {
      const entries = [{ account: "shop_pending", amount: gross }];
      if (net) entries.push({ account: "shop_eligible", amount: -net });
      if (fee) entries.push({ account: "platform_fee", amount: -fee });
      await recordLedgerEvent(
        {
          eventKey: `eligible:${o.id}`,
          kind: "eligibility",
          orderId: o.id,
          entries,
        },
        client,
      );
    }
    await client.query(
      "UPDATE shop_order SET finance_eligible=true,fee_amount=$2 WHERE id=$1",
      [o.id, fee.toString()],
    );
  }
  return rows.length;
}
export async function refreshEligibleBalances(): Promise<number> {
  const shops = (
    await db.query(
      "SELECT DISTINCT shop_id FROM shop_order WHERE status='received' AND finance_eligible=false LIMIT 100",
    )
  ).rows;
  let count = 0;
  for (const s of shops)
    count += await withTransaction(async (c) => {
      await lockShopFinance(c, s.shop_id);
      const now = (
        await c.query("SELECT now() AS time")
      ).rows[0].time.toISOString();
      return recognizeEligible(c, s.shop_id, now);
    });
  return count;
}
async function allowShopRead(actor: Actor, shopId: string) {
  await assertActiveActor(actor);
  if (
    !(
      await db.query("SELECT 1 FROM shop WHERE id=$1 AND owner_user_id=$2", [
        shopId,
        actor.userId,
      ])
    ).rowCount
  )
    await requirePermission(actor, "finance.manage");
}
export async function getShopFinancials(
  actor: Actor,
  shopId: string,
): Promise<{
  pending: string;
  eligible: string;
  reserved: string;
  held: string;
  paid: string;
}> {
  await allowShopRead(actor, shopId);
  return withTransaction(async (client) => {
    await client.query(
      "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
    );
    const rows = (
      await client.query<{ account: string; amount: string; held: boolean }>(
        "SELECT e.account,sum(e.amount)::text AS amount,EXISTS(SELECT 1 FROM return_case c WHERE c.order_id=o.id AND c.status IN ('open','refund_pending')) AS held FROM ledger_entry e JOIN ledger_transaction t ON t.id=e.transaction_id JOIN shop_order o ON o.id=t.order_id WHERE o.shop_id=$1 GROUP BY o.id,e.account",
        [shopId],
      )
    ).rows;
    const sums = {
      pending: 0n,
      eligible: 0n,
      reserved: 0n,
      held: 0n,
      paid: 0n,
    };
    for (const row of rows) {
      const key = {
        shop_pending: "pending",
        shop_eligible: "eligible",
        shop_reserved: "reserved",
      }[row.account] as "pending" | "eligible" | "reserved" | undefined;
      if (key) sums[row.held ? "held" : key] -= BigInt(row.amount);
    }
    sums.paid = BigInt(
      (
        await client.query(
          "SELECT coalesce(-sum(e.amount),0)::text AS amount FROM ledger_entry e JOIN ledger_transaction t ON t.id=e.transaction_id JOIN shop_order o ON o.id=t.order_id WHERE o.shop_id=$1 AND t.kind='payout' AND e.account='cash'",
          [shopId],
        )
      ).rows[0].amount,
    );
    return Object.fromEntries(
      Object.entries(sums).map(([k, v]) => [k, v.toString()]),
    ) as {
      pending: string;
      eligible: string;
      reserved: string;
      held: string;
      paid: string;
    };
  });
}
export async function prepareSettlement(
  actor: Actor,
  shopId: string,
  cutoff: string,
): Promise<string> {
  await requirePermission(actor, "finance.manage");
  assertPayoutOpen();
  if (
    !z.uuid().safeParse(shopId).success ||
    !z.iso.datetime().safeParse(cutoff).success
  )
    throw new DomainError(
      "INVALID_INPUT",
      "Gian hàng hoặc thời điểm chốt không hợp lệ.",
    );
  try {
    return await withTransaction(async (c) => {
      await lockShopFinance(c, shopId);
      const timing = (
        await c.query(
          "SELECT $1::timestamptz<=now() AS valid,(date_trunc('week',now() AT TIME ZONE 'Asia/Ho_Chi_Minh'))::date::text AS period",
          [cutoff],
        )
      ).rows[0];
      if (!timing.valid)
        throw new DomainError(
          "INVALID_INPUT",
          "Không chốt đối soát trong tương lai.",
        );
      await recognizeEligible(c, shopId, cutoff);
      const rows = (
        await c.query(
          "SELECT o.* FROM shop_order o WHERE shop_id=$1 AND finance_eligible=true AND payout_status='none' AND created_at<=$2 AND NOT EXISTS(SELECT 1 FROM return_case r WHERE r.order_id=o.id AND r.status IN ('open','refund_pending')) ORDER BY o.id FOR UPDATE",
          [shopId, cutoff],
        )
      ).rows.filter(
        (o) =>
          BigInt(o.subtotal) +
            BigInt(o.shipping) -
            BigInt(o.refunded_amount) -
            BigInt(o.fee_amount) >
          0n,
      );
      if (!rows.length)
        throw new DomainError(
          "CONFLICT",
          "Chưa có khoản đủ điều kiện đối soát.",
        );
      const beneficiary = (
        await c.query(
          'SELECT bank_name AS "bankName",bank_account AS "bankAccount",bank_holder AS "bankHolder" FROM shop_verification WHERE shop_id=$1',
          [shopId],
        )
      ).rows[0];
      if (!beneficiary)
        throw new DomainError(
          "CONFLICT",
          "Thiếu thông tin nhận tiền đã xác minh.",
        );
      const id = randomUUID(),
        amount = rows.reduce(
          (sum, o) =>
            sum +
            BigInt(o.subtotal) +
            BigInt(o.shipping) -
            BigInt(o.refunded_amount) -
            BigInt(o.fee_amount),
          0n,
        );
      await c.query(
        "INSERT INTO settlement(id,shop_id,period_start,cutoff,amount,beneficiary,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [
          id,
          shopId,
          timing.period,
          cutoff,
          amount.toString(),
          JSON.stringify(beneficiary),
          actor.userId,
        ],
      );
      for (const o of rows) {
        const net =
          BigInt(o.subtotal) +
          BigInt(o.shipping) -
          BigInt(o.refunded_amount) -
          BigInt(o.fee_amount);
        await c.query(
          "INSERT INTO settlement_item(settlement_id,order_id,amount) VALUES($1,$2,$3)",
          [id, o.id, net.toString()],
        );
        await recordLedgerEvent(
          {
            eventKey: `reserve:${id}:${o.id}`,
            kind: "reserve",
            orderId: o.id,
            entries: [
              { account: "shop_eligible", amount: net },
              { account: "shop_reserved", amount: -net },
            ],
          },
          c,
        );
        await c.query(
          "UPDATE shop_order SET payout_status='reserved' WHERE id=$1",
          [o.id],
        );
      }
      await c.query(
        "INSERT INTO audit_event(id,actor_id,action,target_id) VALUES($1,$2,'settlement.prepare',$3)",
        [randomUUID(), actor.userId, id],
      );
      return id;
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    )
      throw new DomainError(
        "CONFLICT",
        "Gian hàng đã có đợt đối soát trong tuần này.",
      );
    throw error;
  }
}
async function settlementRef(id: string) {
  const row = (
    await db.query("SELECT shop_id FROM settlement WHERE id=$1", [id])
  ).rows[0];
  if (!row) throw new DomainError("NOT_FOUND", "Không tìm thấy đợt đối soát.");
  return row.shop_id as string;
}
export async function approveSettlement(
  actor: Actor,
  id: string,
): Promise<void> {
  await requirePermission(actor, "finance.manage");
  assertPayoutOpen();
  const shopId = await settlementRef(id);
  await withTransaction(async (c) => {
    await lockShopFinance(c, shopId);
    const row = (
      await c.query("SELECT status FROM settlement WHERE id=$1 FOR UPDATE", [
        id,
      ])
    ).rows[0];
    if (row.status === "approved") return;
    if (row.status !== "prepared")
      throw new DomainError("CONFLICT", "Đợt không ở trạng thái chờ duyệt.");
    await c.query(
      "UPDATE settlement SET status='approved',approved_by=$2 WHERE id=$1",
      [id, actor.userId],
    );
    await c.query(
      "INSERT INTO audit_event(id,actor_id,action,target_id) VALUES($1,$2,'settlement.approve',$3)",
      [randomUUID(), actor.userId, id],
    );
  });
}
export async function cancelSettlement(
  actor: Actor,
  id: string,
  reason: string,
): Promise<void> {
  await requirePermission(actor, "finance.manage");
  if (reason.trim().length < 10 || reason.length > 1000)
    throw new DomainError("INVALID_INPUT", "Ghi rõ lý do hủy đợt.");
  const shopId = await settlementRef(id);
  await withTransaction(async (c) => {
    await lockShopFinance(c, shopId);
    const row = (
      await c.query("SELECT status FROM settlement WHERE id=$1 FOR UPDATE", [
        id,
      ])
    ).rows[0];
    if (row.status === "cancelled") return;
    if (row.status === "paid")
      throw new DomainError(
        "CONFLICT",
        "Đợt đã chi trả không thể hủy lịch sử.",
      );
    const items = (
      await c.query(
        "SELECT order_id,amount FROM settlement_item WHERE settlement_id=$1 ORDER BY order_id",
        [id],
      )
    ).rows;
    for (const item of items) {
      const amount = BigInt(item.amount);
      await recordLedgerEvent(
        {
          eventKey: `unreserve:${id}:${item.order_id}`,
          kind: "unreserve",
          orderId: item.order_id,
          entries: [
            { account: "shop_reserved", amount },
            { account: "shop_eligible", amount: -amount },
          ],
        },
        c,
      );
      await c.query("UPDATE shop_order SET payout_status='none' WHERE id=$1", [
        item.order_id,
      ]);
    }
    await c.query(
      "UPDATE settlement SET status='cancelled',cancel_reason=$2 WHERE id=$1",
      [id, reason.trim()],
    );
    await c.query(
      "INSERT INTO audit_event(id,actor_id,action,target_id,details) VALUES($1,$2,'settlement.cancel',$3,$4)",
      [
        randomUUID(),
        actor.userId,
        id,
        JSON.stringify({ reason: reason.trim() }),
      ],
    );
  });
}
export async function recordPayout(
  actor: Actor,
  id: string,
  evidenceId: string,
  bankReference: string,
): Promise<void> {
  await requirePermission(actor, "finance.manage");
  assertPayoutOpen();
  if (bankReference.trim().length < 3 || bankReference.length > 120)
    throw new DomainError(
      "INVALID_INPUT",
      "Ghi mã giao dịch chuyển khoản hợp lệ.",
    );
  await getReadyMedia(actor, [evidenceId]);
  const shopId = await settlementRef(id);
  await withTransaction(async (c) => {
    await lockShopFinance(c, shopId);
    const batch = (
      await c.query("SELECT * FROM settlement WHERE id=$1 FOR UPDATE", [id])
    ).rows[0];
    if (batch.status === "paid") {
      if (batch.bank_reference !== bankReference.trim())
        throw new DomainError(
          "CONFLICT",
          "Đợt đã được ghi nhận với mã giao dịch khác.",
        );
      return;
    }
    if (batch.status !== "approved")
      throw new DomainError(
        "CONFLICT",
        "Cần duyệt đợt trước khi ghi nhận chi trả.",
      );
    const items = (
      await c.query(
        "SELECT i.order_id,i.amount,o.payout_status FROM settlement_item i JOIN shop_order o ON o.id=i.order_id WHERE i.settlement_id=$1 ORDER BY o.id FOR UPDATE OF o",
        [id],
      )
    ).rows;
    if (
      !items.length ||
      items.reduce((sum, item) => sum + BigInt(item.amount), 0n) !==
        BigInt(batch.amount)
    )
      throw new DomainError(
        "CONFLICT",
        "Danh sách đơn không khớp tổng tiền đợt chi trả. Cần đối chiếu trước khi ghi nhận.",
      );
    for (const item of items) {
      if (
        item.payout_status !== "reserved" ||
        (
          await c.query(
            "SELECT 1 FROM return_case WHERE order_id=$1 AND status IN ('open','refund_pending')",
            [item.order_id],
          )
        ).rowCount
      )
        throw new DomainError(
          "CONFLICT",
          "Đơn có yêu cầu cần xử lý; chưa được ghi nhận chi trả.",
        );
      const amount = BigInt(item.amount);
      await recordLedgerEvent(
        {
          eventKey: `payout:${id}:${item.order_id}`,
          kind: "payout",
          orderId: item.order_id,
          entries: [
            { account: "cash", amount: -amount },
            { account: "shop_reserved", amount },
          ],
        },
        c,
      );
      await c.query("UPDATE shop_order SET payout_status='paid' WHERE id=$1", [
        item.order_id,
      ]);
    }
    await c.query(
      "UPDATE settlement SET status='paid',paid_at=now(),paid_by=$2,evidence_id=$3,bank_reference=$4 WHERE id=$1",
      [id, actor.userId, evidenceId, bankReference.trim()],
    );
    await c.query(
      "INSERT INTO audit_event(id,actor_id,action,target_id) VALUES($1,$2,'settlement.payout',$3)",
      [randomUUID(), actor.userId, id],
    );
  });
}
export async function listFinanceShops(actor: Actor) {
  await requirePermission(actor, "finance.manage");
  return (
    await db.query(
      "SELECT s.id,s.name FROM shop s JOIN shop_verification v ON v.shop_id=s.id ORDER BY s.name",
    )
  ).rows as { id: string; name: string }[];
}
export async function listSettlements(actor: Actor, shopId?: string) {
  if (shopId) await allowShopRead(actor, shopId);
  else await requirePermission(actor, "finance.manage");
  return (
    await db.query(
      'SELECT b.id,b.shop_id AS "shopId",s.name AS "shopName",b.status,b.amount::text,b.period_start::text AS period,b.beneficiary,b.bank_reference AS "bankReference",b.evidence_id AS "evidenceId" FROM settlement b JOIN shop s ON s.id=b.shop_id WHERE ($1::text IS NULL OR b.shop_id=$1) ORDER BY b.created_at DESC LIMIT 100',
      [shopId ?? null],
    )
  ).rows;
}
