import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import type { PoolClient } from "pg";
import { db, withTransaction } from "@/server/db";
import { consumeQuota } from "@/server/quota";
import { assertActiveActor, requirePermission } from "@/modules/access/service";
import { normalizeSearch } from "@/modules/catalog/schema";
import { searchCatalog, getPublicProduct } from "@/modules/catalog/queries";
import { getPost } from "@/modules/social/queries";
import { DomainError, type Actor } from "@/modules/shared/types";
export type DateRange = { from: string; to: string };
export function vietnamRange(input: DateRange) {
  const parsed = z
    .object({ from: z.iso.date(), to: z.iso.date() })
    .safeParse(input);
  if (!parsed.success)
    throw new DomainError("INVALID_INPUT", "Chọn ngày hợp lệ.");
  const start = new Date(input.from + "T00:00:00+07:00"),
    end = new Date(new Date(input.to + "T00:00:00+07:00").getTime() + 86400000);
  if (end <= start || end.getTime() - start.getTime() > 366 * 86400000)
    throw new DomainError(
      "INVALID_INPUT",
      "Khoảng báo cáo tối đa 366 ngày, ngày kết thúc không trước ngày bắt đầu.",
    );
  return { start: start.toISOString(), end: end.toISOString() };
}
export function csvCell(value: string) {
  return (
    '"' +
    (/^[\s]*[=+\-@\t\r]/.test(value) ? "'" : "") +
    value.replaceAll('"', '""') +
    '"'
  );
}
export type FinancialReport = {
  paidGmv: string;
  paidShipping: string;
  paidOrders: number;
  receipts: string;
  refunds: string;
  payouts: string;
  fees: string;
  netCash: string;
  payable: string;
  sources: { source: string; orders: number; gmv: string }[];
  daily: { day: string; cash: string; fees: string }[];
  activity: {
    activeUsers: number;
    postViews: number;
    productViews: number;
    discoveries: number;
    emptySearches: number;
  } | null;
};
async function report(
  range: DateRange,
  shopId: string | null,
): Promise<FinancialReport> {
  const { start, end } = vietnamRange(range);
  return withTransaction(async (c) => {
    await c.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const scope = "($3::text IS NULL OR o.shop_id=$3)";
    const params = [start, end, shopId];
    const orders = (
      await c.query(
        `SELECT coalesce(sum(o.subtotal),0)::text AS "paidGmv",coalesce(sum(o.shipping),0)::text AS "paidShipping",count(*)::int AS "paidOrders" FROM shop_order o WHERE ${scope} AND o.paid_at>=$1 AND o.paid_at<$2`,
        params,
      )
    ).rows[0];
    const financial = (
      await c.query(
        `SELECT coalesce(sum(e.amount) FILTER(WHERE e.account='cash' AND t.kind='receipt'),0)::text AS receipts,coalesce(-sum(e.amount) FILTER(WHERE e.account='cash' AND t.kind='refund'),0)::text AS refunds,coalesce(-sum(e.amount) FILTER(WHERE e.account='cash' AND t.kind='payout'),0)::text AS payouts,coalesce(-sum(e.amount) FILTER(WHERE e.account='platform_fee'),0)::text AS fees,coalesce(sum(e.amount) FILTER(WHERE e.account='cash'),0)::text AS "netCash" FROM ledger_entry e JOIN ledger_transaction t ON t.id=e.transaction_id JOIN shop_order o ON o.id=t.order_id WHERE ${scope} AND t.created_at>=$1 AND t.created_at<$2`,
        params,
      )
    ).rows[0];
    const payable = (
      await c.query(
        `SELECT coalesce(-sum(e.amount),0)::text AS amount FROM ledger_entry e JOIN ledger_transaction t ON t.id=e.transaction_id JOIN shop_order o ON o.id=t.order_id WHERE ${scope} AND e.account IN ('shop_pending','shop_eligible','shop_reserved') AND t.created_at<$2 AND $1::timestamptz IS NOT NULL`,
        params,
      )
    ).rows[0].amount;
    const sources = (
      await c.query<{ source: string; orders: number; gmv: string }>(
        `SELECT source_kind AS source,count(*)::int AS orders,sum(subtotal)::text AS gmv FROM shop_order o WHERE ${scope} AND o.paid_at>=$1 AND o.paid_at<$2 GROUP BY source_kind ORDER BY source_kind`,
        params,
      )
    ).rows;
    const daily = (
      await c.query<{ day: string; cash: string; fees: string }>(
        `SELECT to_char(t.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh','YYYY-MM-DD') AS day,coalesce(sum(e.amount) FILTER(WHERE e.account='cash'),0)::text AS cash,coalesce(-sum(e.amount) FILTER(WHERE e.account='platform_fee'),0)::text AS fees FROM ledger_entry e JOIN ledger_transaction t ON t.id=e.transaction_id JOIN shop_order o ON o.id=t.order_id WHERE ${scope} AND t.created_at>=$1 AND t.created_at<$2 GROUP BY day ORDER BY day`,
        params,
      )
    ).rows;
    const activity = shopId
      ? null
      : (
          await c.query(
            `SELECT count(DISTINCT user_id)::int AS "activeUsers",count(*) FILTER(WHERE kind='post')::int AS "postViews",count(*) FILTER(WHERE kind='product')::int AS "productViews",count(*) FILTER(WHERE kind='discovery')::int AS discoveries,count(*) FILTER(WHERE kind IN ('search','discovery') AND result_count=0)::int AS "emptySearches" FROM activity_event WHERE created_at>=$1 AND created_at<$2`,
            [start, end],
          )
        ).rows[0];
    return { ...orders, ...financial, payable, sources, daily, activity };
  });
}
export async function getPlatformReport(actor: Actor, range: DateRange) {
  await requirePermission(actor, "reports.platform");
  return report(range, null);
}
export async function getShopReport(
  actor: Actor,
  shopId: string,
  range: DateRange,
) {
  await assertActiveActor(actor);
  if (
    !(
      await db.query("SELECT 1 FROM shop WHERE id=$1 AND owner_user_id=$2", [
        shopId,
        actor.userId,
      ])
    ).rowCount
  )
    throw new DomainError("NOT_FOUND", "Không tìm thấy gian hàng.");
  return report(range, shopId);
}
export async function trackActivity(
  actor: Actor,
  input: unknown,
): Promise<void> {
  await assertActiveActor(actor);
  const parsed = z
    .discriminatedUnion("kind", [
      z.object({ kind: z.literal("post"), targetId: z.uuid() }),
      z.object({ kind: z.literal("product"), targetId: z.uuid() }),
      z.object({
        kind: z.literal("search"),
        query: z.string().trim().min(1).max(300),
      }),
    ])
    .safeParse(input);
  if (!parsed.success)
    throw new DomainError("INVALID_INPUT", "Sự kiện chưa hợp lệ.");
  await consumeQuota(actor.userId, "activity", 60, 60);
  const v = parsed.data;
  let targetId: string,
    resultCount: number | null = null;
  if (v.kind === "search") {
    targetId = createHash("sha256")
      .update(normalizeSearch(v.query))
      .digest("hex");
    resultCount = (await searchCatalog({ query: v.query, limit: 1 })).items
      .length;
  } else {
    targetId = v.targetId;
    if (
      v.kind === "post"
        ? !(await getPost(actor, v.targetId))
        : !(await getPublicProduct(v.targetId))
    )
      throw new DomainError("NOT_FOUND", "Nội dung không còn hiển thị.");
  }
  await withTransaction(async (c) => {
    await c.query(
      "INSERT INTO activity_event(id,user_id,kind,target_id,result_count) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",
      [randomUUID(), actor.userId, v.kind, targetId, resultCount],
    );
    if (v.kind === "post")
      await c.query(
        "INSERT INTO conversion_touch(user_id,kind,target_id) VALUES($1,'post',$2) ON CONFLICT(user_id) DO UPDATE SET kind=excluded.kind,target_id=excluded.target_id,created_at=clock_timestamp()",
        [actor.userId, targetId],
      );
  });
}

export async function recordDiscovery(
  actor: Actor,
  productIds: string[],
): Promise<void> {
  await withTransaction(async (c) => {
    const id = randomUUID();
    await c.query(
      "INSERT INTO discovery_run(id,user_id,product_ids) VALUES($1,$2,$3)",
      [id, actor.userId, JSON.stringify(productIds)],
    );
    await c.query(
      "INSERT INTO activity_event(id,user_id,kind,target_id,result_count) VALUES($1,$2,'discovery',$1,$3)",
      [id, actor.userId, productIds.length],
    );
    await c.query(
      "INSERT INTO conversion_touch(user_id,kind,target_id) VALUES($1,'discovery',$2) ON CONFLICT(user_id) DO UPDATE SET kind=excluded.kind,target_id=excluded.target_id,created_at=clock_timestamp()",
      [actor.userId, id],
    );
  });
}
export async function checkoutSource(
  c: PoolClient,
  actor: Actor,
  productIds: string[],
): Promise<{ kind: string; id: string | null }> {
  const touch = (
    await c.query(
      "SELECT kind,target_id FROM conversion_touch WHERE user_id=$1 AND created_at>now()-interval '7 days'",
      [actor.userId],
    )
  ).rows[0];
  if (touch?.kind === "post") {
    const visible = (
      await c.query(
        `SELECT 1 FROM social_post p JOIN "user" u ON u.id=p.author_id WHERE p.id=$1 AND p.status='published' AND u."emailVerified"=true AND NOT EXISTS(SELECT 1 FROM account_state a WHERE a.user_id=u.id AND a.suspended=true) AND NOT EXISTS(SELECT 1 FROM user_block b WHERE (b.user_id=$2 AND b.target_id=p.author_id) OR (b.target_id=$2 AND b.user_id=p.author_id)) AND EXISTS(SELECT 1 FROM post_product pp WHERE pp.post_id=p.id AND pp.product_id=ANY($3::text[]))`,
        [touch.target_id, actor.userId, productIds],
      )
    ).rowCount;
    if (visible) return { kind: "post", id: touch.target_id };
  }
  if (
    touch?.kind === "discovery" &&
    (
      await c.query(
        "SELECT 1 FROM discovery_run WHERE id=$1 AND user_id=$2 AND product_ids ?| $3::text[]",
        [touch.target_id, actor.userId, productIds],
      )
    ).rowCount
  )
    return { kind: "discovery", id: touch.target_id };
  return { kind: "direct", id: null };
}
