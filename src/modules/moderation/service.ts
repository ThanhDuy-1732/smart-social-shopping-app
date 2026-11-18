import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db, withTransaction } from "@/server/db";
import {
  assertActiveActor,
  requirePermission,
  getAllowedPermissions,
} from "@/modules/access/service";
import { getPost, getPublicProfile } from "@/modules/social/queries";
import { getPublicProduct } from "@/modules/catalog/queries";
import { setUserSuspension } from "@/modules/users/service";
import { setShopSuspension } from "@/modules/shops/service";
import { DomainError, type Actor } from "@/modules/shared/types";
const kinds = z.enum([
  "post",
  "product",
  "comment",
  "review",
  "shop",
  "user",
  "message",
]);
export async function isPubliclyVisible(
  kind: string,
  id: string,
): Promise<boolean> {
  if (!z.uuid().safeParse(id).success) return false;
  if (kind === "post") return Boolean(await getPost(null, id));
  if (kind === "product") return Boolean(await getPublicProduct(id));
  if (kind === "user") return Boolean(await getPublicProfile(null, id));
  if (kind === "shop")
    return Boolean(
      (
        await db.query("SELECT 1 FROM shop WHERE id=$1 AND status='approved'", [
          id,
        ])
      ).rowCount,
    );
  return false;
}
export async function reportContent(
  actor: Actor,
  input: unknown,
): Promise<string> {
  await assertActiveActor(actor);
  const parsed = z
    .object({
      kind: kinds,
      targetId: z.uuid(),
      reason: z.string().trim().min(10).max(2000),
    })
    .safeParse(input);
  if (!parsed.success)
    throw new DomainError(
      "INVALID_INPUT",
      "Chọn nội dung và mô tả lý do từ 10 đến 2000 ký tự.",
    );
  const v = parsed.data;
  let visible = false;
  if (v.kind === "message")
    visible = Boolean(
      (
        await db.query(
          "SELECT 1 FROM chat_message m JOIN conversation c ON c.id=m.conversation_id WHERE m.id=$1 AND (c.first_id=$2 OR c.second_id=$2) AND m.hidden=false",
          [v.targetId, actor.userId],
        )
      ).rowCount,
    );
  else if (v.kind === "post")
    visible = Boolean(await getPost(actor, v.targetId));
  else if (v.kind === "comment") {
    const row = (
      await db.query(
        "SELECT post_id FROM post_comment WHERE id=$1 AND hidden=false",
        [v.targetId],
      )
    ).rows[0];
    visible = Boolean(row && (await getPost(actor, row.post_id)));
  } else if (v.kind === "review") {
    const row = (
      await db.query(
        "SELECT i.product_id FROM purchase_review r JOIN order_item i ON i.id=r.order_item_id WHERE r.id=$1 AND r.hidden=false",
        [v.targetId],
      )
    ).rows[0];
    visible = Boolean(row && (await getPublicProduct(row.product_id)));
  } else if (v.kind === "user")
    visible = Boolean(await getPublicProfile(actor, v.targetId));
  else visible = await isPubliclyVisible(v.kind, v.targetId);
  if (!visible)
    throw new DomainError("NOT_FOUND", "Nội dung không còn được hiển thị.");
  return withTransaction(async (c) => {
    await c.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1,1937198))",
      [actor.userId],
    );
    const old = (
      await c.query(
        "SELECT id FROM content_report WHERE reporter_id=$1 AND kind=$2 AND target_id=$3 AND status='open'",
        [actor.userId, v.kind, v.targetId],
      )
    ).rows[0];
    if (old) return old.id;
    if (
      (
        await c.query(
          "SELECT count(*)::int AS count FROM content_report WHERE reporter_id=$1 AND created_at>now()-interval '1 day'",
          [actor.userId],
        )
      ).rows[0].count >= 20
    )
      throw new DomainError(
        "CONFLICT",
        "Bạn đã gửi nhiều báo cáo hôm nay. Vui lòng quay lại sau.",
      );
    const id = randomUUID();
    await c.query(
      "INSERT INTO content_report(id,reporter_id,kind,target_id,reason) VALUES($1,$2,$3,$4,$5)",
      [id, actor.userId, v.kind, v.targetId, v.reason],
    );
    return id;
  });
}
export async function moderate(
  actor: Actor,
  reportId: string,
  input: unknown,
): Promise<void> {
  const parsed = z
    .object({
      action: z.enum(["hide", "dismiss"]),
      reason: z.string().trim().min(10).max(2000),
    })
    .safeParse(input);
  if (!parsed.success)
    throw new DomainError("INVALID_INPUT", "Ghi quyết định và lý do xử lý.");
  const decision = parsed.data;
  const report = (
    await db.query("SELECT kind FROM content_report WHERE id=$1", [reportId])
  ).rows[0];
  if (!report) throw new DomainError("NOT_FOUND", "Không tìm thấy báo cáo.");
  const permission =
    report.kind === "user"
      ? "users.manage"
      : report.kind === "shop"
        ? "shops.review"
        : "content.moderate";
  await requirePermission(actor, permission);
  await withTransaction(async (c) => {
    const row = (
      await c.query("SELECT * FROM content_report WHERE id=$1 FOR UPDATE", [
        reportId,
      ])
    ).rows[0];
    if (row.status !== "open")
      throw new DomainError("CONFLICT", "Báo cáo đã được xử lý.");
    if (decision.action === "hide") {
      if (row.kind === "user")
        await setUserSuspension(c, actor, row.target_id, true);
      else if (row.kind === "shop")
        await setShopSuspension(c, actor, row.target_id, true, decision.reason);
      else {
        const target = {
          post: { table: "social_post", change: "status='hidden'" },
          product: { table: "product", change: "status='hidden'" },
          comment: { table: "post_comment", change: "hidden=true" },
          review: { table: "purchase_review", change: "hidden=true" },
          message: { table: "chat_message", change: "hidden=true" },
        }[row.kind as "post" | "product" | "comment" | "review" | "message"];
        if (!target)
          throw new DomainError("INVALID_INPUT", "Loại nội dung chưa hỗ trợ.");
        await c.query(
          `UPDATE ${target.table} SET ${target.change} WHERE id=$1`,
          [row.target_id],
        );
      }
    }
    await c.query(
      "UPDATE content_report SET status='resolved',decision=$2,resolution=$3,resolved_by=$4,resolved_at=now() WHERE id=$1",
      [reportId, decision.action, decision.reason, actor.userId],
    );
    await c.query(
      "INSERT INTO audit_event(id,actor_id,action,target_id,details) VALUES($1,$2,'content.moderate',$3,$4)",
      [
        randomUUID(),
        actor.userId,
        row.target_id,
        JSON.stringify({ reportId, ...decision }),
      ],
    );
  });
}
// shortcut: The moderation queue returns at most 100 reports; add paging and search for larger queues.
export async function listReports(actor: Actor) {
  const allowed = await getAllowedPermissions(actor);
  const visibleKinds: string[] = [];
  if (allowed.includes("content.moderate"))
    visibleKinds.push("post", "product", "comment", "review", "message");
  if (allowed.includes("users.manage")) visibleKinds.push("user");
  if (allowed.includes("shops.review")) visibleKinds.push("shop");
  if (!visibleKinds.length)
    throw new DomainError("FORBIDDEN", "Bạn không có quyền kiểm duyệt.");
  return withTransaction(async (c) => {
    const rows = (
      await c.query(
        `SELECT r.id,r.kind,r.target_id AS "targetId",r.reason,r.status,r.resolution,u.name AS "reporterName",CASE r.kind WHEN 'message' THEN (SELECT text FROM chat_message WHERE id=r.target_id) WHEN 'post' THEN (SELECT p.text FROM social_post p WHERE p.id=r.target_id) WHEN 'product' THEN (SELECT p.name||': '||p.description FROM product p WHERE p.id=r.target_id) WHEN 'comment' THEN (SELECT c.text FROM post_comment c WHERE c.id=r.target_id) WHEN 'review' THEN (SELECT v.text FROM purchase_review v WHERE v.id=r.target_id) WHEN 'user' THEN (SELECT name FROM "user" WHERE id=r.target_id) WHEN 'shop' THEN (SELECT name FROM shop WHERE id=r.target_id) END AS preview,CASE r.kind WHEN 'message' THEN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.id,'kind',m.kind)),'[]') FROM chat_message cm JOIN media m ON m.id=cm.media_id WHERE cm.id=r.target_id AND m.status='ready') WHEN 'post' THEN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.id,'kind',m.kind)),'[]') FROM post_media pm JOIN media m ON m.id=pm.media_id WHERE pm.post_id=r.target_id AND m.status='ready') WHEN 'product' THEN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.id,'kind',m.kind)),'[]') FROM product_media pm JOIN media m ON m.id=pm.media_id WHERE pm.product_id=r.target_id AND m.status='ready') ELSE '[]'::jsonb END AS media FROM content_report r LEFT JOIN "user" u ON u.id=r.reporter_id WHERE r.kind=ANY($1::text[]) ORDER BY (r.status='open') DESC,r.created_at DESC LIMIT 100`,
        [visibleKinds],
      )
    ).rows;
    for (const row of rows)
      if (row.kind === "message" && row.preview !== null)
        await c.query(
          "INSERT INTO audit_event(id,actor_id,action,target_id,details) VALUES($1,$2,'evidence.read',$3,$4)",
          [
            randomUUID(),
            actor.userId,
            row.targetId,
            JSON.stringify({
              scope: "reported-message-preview",
              reportId: row.id,
            }),
          ],
        );
    return rows;
  });
}
