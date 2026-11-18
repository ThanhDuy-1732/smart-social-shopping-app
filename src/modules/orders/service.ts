import { notifyUser } from "@/modules/notifications/service";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db, withTransaction } from "@/server/db";
import { assertActiveActor, requirePermission } from "@/modules/access/service";
import { getReadyMedia } from "@/modules/media/service";
import { lockShopFinance } from "@/modules/finance/lock";
import { DomainError, type Actor } from "@/modules/shared/types";
import { releaseHeldInventory, type Address } from "@/modules/checkout/service";
import type { TradingPolicy } from "@/modules/policies/service";
const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("accept") }),
  z.object({
    type: z.literal("ship"),
    carrier: z.string().trim().min(2).max(80),
    trackingCode: z.string().trim().min(2).max(100),
  }),
  z.object({ type: z.literal("receive") }),
  z.object({
    type: z.literal("verify_receipt"),
    evidenceId: z.uuid(),
    reason: z.string().trim().min(10).max(1000),
  }),
  z.object({
    type: z.literal("cancel"),
    reason: z.string().trim().min(10).max(1000),
  }),
]);
export type OrderAction = z.infer<typeof actionSchema>;
export type OrderDetail = {
  id: string;
  checkoutId: string;
  shopId: string;
  shopName: string;
  buyerId: string;
  ownerId: string;
  status: string;
  subtotal: string;
  shipping: string;
  refundedAmount: string;
  receivedAt: Date | null;
  paidAt: Date | null;
  carrier: string | null;
  trackingCode: string | null;
  address: Address;
  policy: TradingPolicy;
  payoutStatus: string;
  items: {
    id: string;
    productId: string;
    name: string;
    label: string;
    quantity: number;
    unitPrice: string;
  }[];
  cases: {
    id: string;
    reason: string;
    status: string;
    requestedItemsAmount: string;
    requestedShippingAmount: string;
    refundAmount: string | null;
    refundStatus: string | null;
    evidenceIds: string[];
    sellerReply: string | null;
  }[];
};
export async function getOrder(actor: Actor, id: string): Promise<OrderDetail> {
  await assertActiveActor(actor);
  const row = (
    await db.query<Omit<OrderDetail, "items" | "cases">>(
      'SELECT o.id,o.checkout_id AS "checkoutId",o.shop_id AS "shopId",s.name AS "shopName",c.buyer_id AS "buyerId",s.owner_user_id AS "ownerId",o.status,o.subtotal::text,o.shipping::text,o.refunded_amount::text AS "refundedAmount",o.received_at AS "receivedAt",o.paid_at AS "paidAt",o.carrier,o.tracking_code AS "trackingCode",c.address,o.policy_snapshot AS policy,o.payout_status AS "payoutStatus" FROM shop_order o JOIN checkout c ON c.id=o.checkout_id JOIN shop s ON s.id=o.shop_id WHERE o.id=$1',
      [id],
    )
  ).rows[0];
  if (!row) throw new DomainError("NOT_FOUND", "Không tìm thấy đơn hàng.");
  if (actor.userId !== row.buyerId && actor.userId !== row.ownerId) {
    try {
      await requirePermission(actor, "disputes.manage");
    } catch (error) {
      if (error instanceof DomainError)
        throw new DomainError("NOT_FOUND", "Không tìm thấy đơn hàng.");
      throw error;
    }
  }
  const items = (
    await db.query<OrderDetail["items"][number]>(
      'SELECT id,product_id AS "productId",name,label,quantity,unit_price::text AS "unitPrice" FROM order_item WHERE order_id=$1 ORDER BY id',
      [id],
    )
  ).rows;
  const cases = (
    await db.query<OrderDetail["cases"][number]>(
      'SELECT c.id,c.reason,c.status,c.seller_reply AS "sellerReply",c.requested_items_amount::text AS "requestedItemsAmount",c.requested_shipping_amount::text AS "requestedShippingAmount",r.amount::text AS "refundAmount",(SELECT coalesce(jsonb_agg(e.media_id),\'[]\') FROM return_evidence e WHERE e.case_id=c.id) AS "evidenceIds",r.status AS "refundStatus" FROM return_case c LEFT JOIN refund r ON r.case_id=c.id WHERE c.order_id=$1 ORDER BY c.created_at DESC',
      [id],
    )
  ).rows;
  return { ...row, items, cases };
}
export async function transitionOrder(
  actor: Actor,
  id: string,
  input: unknown,
): Promise<void> {
  await assertActiveActor(actor);
  const parsed = actionSchema.safeParse(input);
  if (!parsed.success)
    throw new DomainError(
      "INVALID_INPUT",
      "Thông tin cập nhật đơn chưa hợp lệ.",
    );
  const action = parsed.data;
  const detail = await getOrder(actor, id);
  const owner = actor.userId === detail.ownerId,
    buyer = actor.userId === detail.buyerId;
  if ((action.type === "accept" || action.type === "ship") && !owner)
    throw new DomainError(
      "FORBIDDEN",
      "Chỉ shop của đơn này được cập nhật giao hàng.",
    );
  if (action.type === "receive" && !buyer)
    throw new DomainError(
      "FORBIDDEN",
      "Chỉ người mua được xác nhận nhận hàng.",
    );
  if (
    action.type === "verify_receipt" ||
    (action.type === "cancel" && !owner && !buyer)
  )
    await requirePermission(actor, "disputes.manage");
  if (action.type === "verify_receipt")
    await getReadyMedia(actor, [action.evidenceId]);
  await withTransaction(async (client) => {
    await lockShopFinance(client, detail.shopId);
    await client.query("SELECT id FROM checkout WHERE id=$1 FOR UPDATE", [
      detail.checkoutId,
    ]);
    const row = (
      await client.query("SELECT * FROM shop_order WHERE id=$1 FOR UPDATE", [
        id,
      ])
    ).rows[0];
    if (action.type === "accept") {
      if (row.status === "accepted") return;
      if (row.status !== "paid")
        throw new DomainError("CONFLICT", "Đơn chưa sẵn sàng để xác nhận.");
      const deadline =
        new Date(row.paid_at ?? row.created_at).getTime() +
        Number(row.policy_snapshot.sellerAcceptHours) * 3600000;
      if (Date.now() > deadline)
        throw new DomainError(
          "CONFLICT",
          "Đã quá thời hạn xác nhận. Vui lòng liên hệ hỗ trợ hoặc hủy để xử lý hoàn tiền.",
        );
      await client.query(
        "UPDATE shop_order SET status='accepted',accepted_at=now() WHERE id=$1",
        [id],
      );
    } else if (action.type === "ship") {
      if (
        row.status === "shipped" &&
        row.carrier === action.carrier &&
        row.tracking_code === action.trackingCode
      )
        return;
      if (row.status !== "accepted")
        throw new DomainError(
          "CONFLICT",
          "Cần xác nhận đơn trước khi giao hàng.",
        );
      await client.query(
        "UPDATE shop_order SET status='shipped',shipped_at=now(),carrier=$2,tracking_code=$3 WHERE id=$1",
        [id, action.carrier, action.trackingCode],
      );
    } else if (action.type === "receive" || action.type === "verify_receipt") {
      if (row.status === "received") return;
      if (row.status !== "shipped")
        throw new DomainError("CONFLICT", "Đơn chưa ở trạng thái đang giao.");
      await client.query(
        "UPDATE shop_order SET status='received',received_at=now() WHERE id=$1",
        [id],
      );
      if (action.type === "verify_receipt")
        await client.query(
          "INSERT INTO order_evidence(order_id,media_id) VALUES($1,$2)",
          [id, action.evidenceId],
        );
    } else {
      if (row.status === "cancelled") return;
      if (row.status === "awaiting_payment") {
        if (!buyer)
          throw new DomainError(
            "FORBIDDEN",
            "Chỉ người mua được hủy đơn chưa thanh toán.",
          );
        const c = (
          await client.query("SELECT status FROM checkout WHERE id=$1", [
            detail.checkoutId,
          ])
        ).rows[0];
        if (c.status !== "awaiting_payment")
          throw new DomainError(
            "CONFLICT",
            "Thanh toán đã đổi trạng thái. Vui lòng tải lại đơn.",
          );
        await releaseHeldInventory(client, detail.checkoutId);
        await client.query(
          "UPDATE checkout SET status='expired',cancel_reason='buyer' WHERE id=$1",
          [detail.checkoutId],
        );
        await client.query(
          "UPDATE shop_order SET status='cancelled' WHERE checkout_id=$1",
          [detail.checkoutId],
        );
      } else {
        if (
          !["paid", "accepted"].includes(row.status) ||
          (buyer && !owner && row.status !== "paid")
        )
          throw new DomainError(
            "CONFLICT",
            "Đơn đã được xử lý. Hãy gửi yêu cầu hỗ trợ/đổi trả.",
          );
        if (
          (
            await client.query(
              "SELECT 1 FROM return_case WHERE order_id=$1 AND status IN ('open','refund_pending')",
              [id],
            )
          ).rowCount
        )
          throw new DomainError("CONFLICT", "Đơn đang có yêu cầu cần xử lý.");
        await client.query(
          "INSERT INTO return_case(id,order_id,requester_id,kind,reason,requested_items_amount,requested_shipping_amount) VALUES($1,$2,$3,'cancellation',$4,$5,$6)",
          [
            randomUUID(),
            id,
            actor.userId,
            action.reason,
            (
              BigInt(row.subtotal) - BigInt(row.refunded_items_amount)
            ).toString(),
            (
              BigInt(row.shipping) - BigInt(row.refunded_shipping_amount)
            ).toString(),
          ],
        );
        const returned = (
          await client.query(
            "SELECT variant_id,quantity FROM order_item WHERE order_id=$1 ORDER BY variant_id",
            [id],
          )
        ).rows;
        for (const item of returned)
          await client.query(
            "UPDATE product_variant SET stock=stock+$2 WHERE id=$1",
            [item.variant_id, item.quantity],
          );
        await client.query(
          "UPDATE shop_order SET status='cancelled' WHERE id=$1",
          [id],
        );
      }
    }
    for (const userId of new Set([detail.buyerId, detail.ownerId]))
      await notifyUser(
        userId,
        {
          eventKey: `order:${id}:${action.type}`,
          title: "Đơn hàng của bạn đã cập nhật",
          href: `/orders/${id}`,
          email: true,
        },
        client,
      );
    await client.query(
      "INSERT INTO audit_event(id,actor_id,action,target_id,details) VALUES($1,$2,$3,$4,$5)",
      [
        randomUUID(),
        actor.userId,
        `order.${action.type}`,
        id,
        JSON.stringify(action),
      ],
    );
  });
}
async function listOrders(actor: Actor, seller: boolean) {
  await assertActiveActor(actor);
  return (
    await db.query<{
      id: string;
      shopName: string;
      status: string;
      total: string;
      createdAt: Date;
    }>(
      `SELECT o.id,s.name AS "shopName",o.status,(o.subtotal+o.shipping)::text AS total,o.created_at AS "createdAt" FROM shop_order o JOIN checkout c ON c.id=o.checkout_id JOIN shop s ON s.id=o.shop_id WHERE ${seller ? "s.owner_user_id" : "c.buyer_id"}=$1 ORDER BY o.created_at DESC,o.id LIMIT 100`,
      [actor.userId],
    )
  ).rows;
}
export const listBuyerOrders = (actor: Actor) => listOrders(actor, false);
export const listSellerOrders = (actor: Actor) => listOrders(actor, true);
