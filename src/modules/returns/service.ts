import { recordConfirmedRefund } from "@/modules/finance/service";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db, withTransaction } from "@/server/db";
import {
  assertActiveActor,
  requirePermission,
  getAllowedPermissions,
} from "@/modules/access/service";
import { getReadyMedia } from "@/modules/media/service";
import { lockShopFinance } from "@/modules/finance/lock";
import { DomainError, type Actor } from "@/modules/shared/types";
const requestSchema = z
  .object({
    orderId: z.uuid(),
    reason: z.string().trim().min(10).max(2000),
    items: z
      .array(
        z.object({
          itemId: z.uuid(),
          quantity: z.number().int().min(1).max(99),
        }),
      )
      .min(1)
      .max(100),
    evidenceIds: z.array(z.uuid()).max(6).default([]),
  })
  .refine((x) => new Set(x.items.map((i) => i.itemId)).size === x.items.length);
export async function requestReturn(
  actor: Actor,
  input: unknown,
): Promise<string> {
  await assertActiveActor(actor);
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success)
    throw new DomainError(
      "INVALID_INPUT",
      "Kiểm tra lý do, sản phẩm và số lượng đổi trả.",
    );
  const v = parsed.data;
  await getReadyMedia(actor, v.evidenceIds);
  const ref = (
    await db.query("SELECT shop_id FROM shop_order WHERE id=$1", [v.orderId])
  ).rows[0];
  if (!ref) throw new DomainError("NOT_FOUND", "Không tìm thấy đơn.");
  return withTransaction(async (client) => {
    await lockShopFinance(client, ref.shop_id);
    const row = (
      await client.query(
        "SELECT o.*,c.buyer_id,(o.received_at IS NULL OR clock_timestamp()<=o.received_at+make_interval(days=>(o.policy_snapshot->>'returnDays')::int)) AS within_window FROM shop_order o JOIN checkout c ON c.id=o.checkout_id WHERE o.id=$1 FOR UPDATE OF o",
        [v.orderId],
      )
    ).rows[0];
    if (row.buyer_id !== actor.userId)
      throw new DomainError(
        "FORBIDDEN",
        "Chỉ người mua của đơn được yêu cầu đổi trả.",
      );
    if (
      !["paid", "accepted", "shipped", "received", "refund_required"].includes(
        row.status,
      )
    )
      throw new DomainError(
        "CONFLICT",
        "Đơn chưa đủ điều kiện yêu cầu đổi trả.",
      );
    if (!row.within_window)
      throw new DomainError(
        "CONFLICT",
        "Đã quá thời hạn yêu cầu đổi trả theo chính sách của đơn.",
      );
    let total = 0n;
    for (const entry of v.items) {
      const item = (
        await client.query(
          "SELECT quantity,unit_price::text FROM order_item WHERE id=$1 AND order_id=$2",
          [entry.itemId, v.orderId],
        )
      ).rows[0];
      const used = (
        await client.query(
          "SELECT coalesce(sum(i.quantity),0)::int AS quantity FROM return_item i JOIN return_case c ON c.id=i.case_id WHERE i.item_id=$1 AND c.kind='return' AND c.status<>'rejected'",
          [entry.itemId],
        )
      ).rows[0].quantity;
      if (!item || entry.quantity > item.quantity - used)
        throw new DomainError(
          "INVALID_INPUT",
          "Số lượng yêu cầu vượt phần hàng có thể đổi trả.",
        );
      total += BigInt(item.unit_price) * BigInt(entry.quantity);
    }
    const id = randomUUID();
    const shipping =
      row.status === "refund_required"
        ? BigInt(row.shipping) - BigInt(row.refunded_shipping_amount)
        : 0n;
    await client.query(
      "INSERT INTO return_case(id,order_id,requester_id,reason,requested_items_amount,requested_shipping_amount) VALUES($1,$2,$3,$4,$5,$6)",
      [
        id,
        v.orderId,
        actor.userId,
        v.reason,
        total.toString(),
        shipping.toString(),
      ],
    );
    for (const entry of v.items)
      await client.query(
        "INSERT INTO return_item(case_id,item_id,quantity) VALUES($1,$2,$3)",
        [id, entry.itemId, entry.quantity],
      );
    for (const mediaId of v.evidenceIds)
      await client.query(
        "INSERT INTO return_evidence(case_id,media_id) VALUES($1,$2)",
        [id, mediaId],
      );
    return id;
  });
}
export async function approveRefund(
  actor: Actor,
  caseId: string,
  amount: bigint,
): Promise<string> {
  await requirePermission(actor, "finance.manage");
  if (typeof amount !== "bigint" || amount <= 0n)
    throw new DomainError("INVALID_INPUT", "Số tiền hoàn phải lớn hơn 0.");
  const ref = (
    await db.query(
      "SELECT c.order_id,o.shop_id FROM return_case c JOIN shop_order o ON o.id=c.order_id WHERE c.id=$1",
      [caseId],
    )
  ).rows[0];
  if (!ref) throw new DomainError("NOT_FOUND", "Không tìm thấy yêu cầu.");
  return withTransaction(async (client) => {
    await lockShopFinance(client, ref.shop_id);
    const order = (
      await client.query("SELECT * FROM shop_order WHERE id=$1 FOR UPDATE", [
        ref.order_id,
      ])
    ).rows[0];
    const c = (
      await client.query("SELECT * FROM return_case WHERE id=$1 FOR UPDATE", [
        caseId,
      ])
    ).rows[0];
    if (c.status !== "open")
      throw new DomainError("CONFLICT", "Yêu cầu đã được xử lý.");
    if (order.payout_status !== "none")
      throw new DomainError(
        "CONFLICT",
        "Đơn đã nằm trong đợt chi trả. Cần xử lý đợt chi trả và nguồn hoàn trước khi duyệt hoàn tiền.",
      );
    const maximum =
      BigInt(c.requested_items_amount) + BigInt(c.requested_shipping_amount);
    if (c.kind === "cancellation" && amount !== maximum)
      throw new DomainError(
        "INVALID_INPUT",
        "Đơn hủy cần hoàn toàn bộ phần tiền còn lại.",
      );
    if (
      amount > maximum ||
      amount >
        BigInt(order.subtotal) +
          BigInt(order.shipping) -
          BigInt(order.refunded_amount)
    )
      throw new DomainError(
        "INVALID_INPUT",
        "Số tiền hoàn vượt giới hạn của yêu cầu hoặc phần tiền còn lại.",
      );
    const itemAmount =
        amount > BigInt(c.requested_items_amount)
          ? BigInt(c.requested_items_amount)
          : amount,
      shippingAmount = amount - itemAmount;
    const pending = (
      await client.query(
        "SELECT coalesce(sum(r.item_amount),0)::text AS items,coalesce(sum(r.shipping_amount),0)::text AS shipping FROM refund r JOIN return_case c ON c.id=r.case_id WHERE c.order_id=$1 AND r.status IN ('pending','failed')",
        [ref.order_id],
      )
    ).rows[0];
    if (
      itemAmount + BigInt(pending.items) >
        BigInt(order.subtotal) - BigInt(order.refunded_items_amount) ||
      shippingAmount + BigInt(pending.shipping) >
        BigInt(order.shipping) - BigInt(order.refunded_shipping_amount)
    )
      throw new DomainError(
        "CONFLICT",
        "Một phần tiền đang được xử lý hoàn ở yêu cầu khác.",
      );
    const id = randomUUID();
    await client.query(
      "INSERT INTO refund(id,case_id,amount,item_amount,shipping_amount,approved_by) VALUES($1,$2,$3,$4,$5,$6)",
      [
        id,
        caseId,
        amount.toString(),
        itemAmount.toString(),
        shippingAmount.toString(),
        actor.userId,
      ],
    );
    await client.query(
      "UPDATE return_case SET status='refund_pending' WHERE id=$1",
      [caseId],
    );
    await client.query(
      "INSERT INTO audit_event(id,actor_id,action,target_id,details) VALUES($1,$2,'refund.approve',$3,$4)",
      [
        randomUUID(),
        actor.userId,
        id,
        JSON.stringify({ amount: amount.toString() }),
      ],
    );
    return id;
  });
}
// Only call from a provider adapter after verifying the provider's refund result.
export async function applyVerifiedRefund(input: unknown): Promise<void> {
  const parsed = z
    .object({
      refundId: z.uuid(),
      providerReference: z.string().min(1).max(200),
      amount: z.string().regex(/^[1-9]\d{0,17}$/),
      currency: z.literal("VND"),
      status: z.enum(["succeeded", "failed"]),
    })
    .safeParse(input);
  if (!parsed.success)
    throw new DomainError("INVALID_INPUT", "Kết quả hoàn tiền không hợp lệ.");
  const v = parsed.data;
  const ref = (
    await db.query(
      "SELECT r.case_id,c.order_id,o.shop_id FROM refund r JOIN return_case c ON c.id=r.case_id JOIN shop_order o ON o.id=c.order_id WHERE r.id=$1",
      [v.refundId],
    )
  ).rows[0];
  if (!ref) throw new DomainError("NOT_FOUND", "Không tìm thấy khoản hoàn.");
  await withTransaction(async (client) => {
    await lockShopFinance(client, ref.shop_id);
    const order = (
      await client.query("SELECT * FROM shop_order WHERE id=$1 FOR UPDATE", [
        ref.order_id,
      ])
    ).rows[0];
    const refund = (
      await client.query("SELECT * FROM refund WHERE id=$1 FOR UPDATE", [
        v.refundId,
      ])
    ).rows[0];
    if (BigInt(refund.amount) !== BigInt(v.amount))
      throw new DomainError(
        "INVALID_INPUT",
        "Số tiền hoàn không khớp yêu cầu.",
      );
    if (refund.status === "succeeded") return;
    if (order.payout_status !== "none")
      throw new DomainError(
        "CONFLICT",
        "Khoản chi trả đang cần đối chiếu trước khi ghi nhận hoàn.",
      );
    if (v.status === "failed") {
      await client.query("UPDATE refund SET status='failed' WHERE id=$1", [
        v.refundId,
      ]);
      return;
    }
    await recordConfirmedRefund(
      client,
      ref.order_id,
      v.refundId,
      BigInt(refund.amount),
      BigInt(refund.item_amount),
    );
    await client.query(
      "UPDATE refund SET status='succeeded',provider_reference=$2 WHERE id=$1",
      [v.refundId, v.providerReference],
    );
    await client.query("UPDATE return_case SET status='refunded' WHERE id=$1", [
      ref.case_id,
    ]);
    await client.query(
      "UPDATE shop_order SET refunded_amount=refunded_amount+$2,refunded_items_amount=refunded_items_amount+$3,refunded_shipping_amount=refunded_shipping_amount+$4 WHERE id=$1",
      [ref.order_id, refund.amount, refund.item_amount, refund.shipping_amount],
    );
  });
}
export async function rejectReturn(
  actor: Actor,
  caseId: string,
  reason: string,
): Promise<void> {
  await requirePermission(actor, "disputes.manage");
  if (reason.trim().length < 10 || reason.length > 2000)
    throw new DomainError("INVALID_INPUT", "Ghi rõ lý do ít nhất 10 ký tự.");
  const ref = (
    await db.query(
      "SELECT c.order_id,o.shop_id FROM return_case c JOIN shop_order o ON o.id=c.order_id WHERE c.id=$1",
      [caseId],
    )
  ).rows[0];
  if (!ref) throw new DomainError("NOT_FOUND", "Không tìm thấy yêu cầu.");
  await withTransaction(async (client) => {
    await lockShopFinance(client, ref.shop_id);
    const changed = await client.query(
      "UPDATE return_case SET status='rejected',resolution=$2 WHERE id=$1 AND status='open' RETURNING id",
      [caseId, reason.trim()],
    );
    if (!changed.rowCount)
      throw new DomainError("CONFLICT", "Yêu cầu đã được xử lý.");
    await client.query(
      "INSERT INTO audit_event(id,actor_id,action,target_id,details) VALUES($1,$2,'return.reject',$3,$4)",
      [
        randomUUID(),
        actor.userId,
        caseId,
        JSON.stringify({ reason: reason.trim() }),
      ],
    );
  });
}
export async function listReturnCases(actor: Actor) {
  const allowed = await getAllowedPermissions(actor);
  if (
    !allowed.includes("disputes.manage") &&
    !allowed.includes("finance.manage")
  )
    throw new DomainError("FORBIDDEN", "Bạn không có quyền xem yêu cầu xử lý.");
  return (
    await db.query(
      'SELECT c.id,c.order_id AS "orderId",c.reason,c.status,c.requested_items_amount::text AS "requestedItemsAmount",c.requested_shipping_amount::text AS "requestedShippingAmount",s.name AS "shopName",r.amount::text AS "refundAmount",(SELECT coalesce(jsonb_agg(e.media_id),\'[]\') FROM return_evidence e WHERE e.case_id=c.id) AS "evidenceIds",r.status AS "refundStatus" FROM return_case c JOIN shop_order o ON o.id=c.order_id JOIN shop s ON s.id=o.shop_id LEFT JOIN refund r ON r.case_id=c.id ORDER BY c.created_at DESC LIMIT 100',
    )
  ).rows;
}
