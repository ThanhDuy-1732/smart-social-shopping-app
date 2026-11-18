import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db, withTransaction } from "@/server/db";
import { assertActiveActor } from "@/modules/access/service";
import { getReadyMedia } from "@/modules/media/service";
import { normalizeSearch } from "@/modules/catalog/schema";
import { DomainError, type Actor } from "@/modules/shared/types";
import { getPost } from "./queries";
const postSchema = z
  .object({
    text: z.string().trim().min(1).max(5000),
    mediaIds: z.array(z.uuid()).max(12).default([]),
    productIds: z.array(z.uuid()).max(12).default([]),
    topics: z.array(z.string().trim().min(1).max(40)).max(5).default([]),
  })
  .refine(
    (v) =>
      new Set(v.mediaIds).size === v.mediaIds.length &&
      new Set(v.productIds).size === v.productIds.length,
  );
export async function createPost(
  actor: Actor,
  input: unknown,
): Promise<string> {
  await assertActiveActor(actor);
  const parsed = postSchema.safeParse(input);
  if (!parsed.success)
    throw new DomainError(
      "INVALID_INPUT",
      "Kiểm tra nội dung, chủ đề và các tệp đã chọn.",
    );
  const v = parsed.data;
  await getReadyMedia(actor, v.mediaIds);
  return withTransaction(async (c) => {
    await c.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1,1937197))",
      [actor.userId],
    );
    if (
      (
        await c.query(
          "SELECT count(*)::int AS count FROM social_post WHERE author_id=$1 AND created_at>now()-interval '1 hour'",
          [actor.userId],
        )
      ).rows[0].count >= 10
    )
      throw new DomainError(
        "CONFLICT",
        "Bạn đã đăng nhiều bài trong giờ này. Hãy quay lại sau.",
      );
    if (
      v.productIds.length &&
      (
        await c.query(
          "SELECT p.id FROM product p JOIN shop s ON s.id=p.shop_id WHERE p.id=ANY($1::text[]) AND p.status='published' AND s.status='approved'",
          [v.productIds],
        )
      ).rowCount !== v.productIds.length
    )
      throw new DomainError(
        "INVALID_INPUT",
        "Một sản phẩm đã ngừng bán hoặc chưa được duyệt.",
      );
    const id = randomUUID();
    await c.query(
      "INSERT INTO social_post(id,author_id,text,topics,search_text) VALUES($1,$2,$3,$4,$5)",
      [
        id,
        actor.userId,
        v.text,
        v.topics,
        normalizeSearch([v.text, ...v.topics].join(" ")),
      ],
    );
    for (const [position, mediaId] of v.mediaIds.entries())
      await c.query(
        "INSERT INTO post_media(post_id,media_id,position) VALUES($1,$2,$3)",
        [id, mediaId, position],
      );
    for (const productId of v.productIds)
      await c.query(
        "INSERT INTO post_product(post_id,product_id) VALUES($1,$2)",
        [id, productId],
      );
    return id;
  });
}
const interaction = z.discriminatedUnion("type", [
  z.object({
    type: z.enum(["follow", "block", "like", "save"]),
    targetId: z.uuid(),
    enabled: z.boolean(),
  }),
  z.object({
    type: z.literal("comment"),
    targetId: z.uuid(),
    text: z.string().trim().min(1).max(2000),
  }),
]);
export async function interact(actor: Actor, input: unknown): Promise<void> {
  await assertActiveActor(actor);
  const result = interaction.safeParse(input);
  if (!result.success)
    throw new DomainError("INVALID_INPUT", "Tương tác không hợp lệ.");
  const v = result.data;
  if (v.type === "follow" || v.type === "block") {
    if (actor.userId === v.targetId)
      throw new DomainError(
        "INVALID_INPUT",
        "Không áp dụng thao tác cho chính mình.",
      );
    if (
      !(
        await db.query(
          'SELECT 1 FROM "user" WHERE id=$1 AND "emailVerified"=true',
          [v.targetId],
        )
      ).rowCount
    )
      throw new DomainError("NOT_FOUND", "Không tìm thấy người dùng.");
    await withTransaction(async (c) => {
      if (
        v.type === "follow" &&
        v.enabled &&
        (
          await c.query(
            "SELECT 1 FROM user_block WHERE (user_id=$1 AND target_id=$2) OR (user_id=$2 AND target_id=$1)",
            [actor.userId, v.targetId],
          )
        ).rowCount
      )
        throw new DomainError("NOT_FOUND", "Không tìm thấy người dùng.");
      const table = v.type === "follow" ? "user_follow" : "user_block";
      if (v.enabled)
        await c.query(
          `INSERT INTO ${table}(user_id,target_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,
          [actor.userId, v.targetId],
        );
      else
        await c.query(
          `DELETE FROM ${table} WHERE user_id=$1 AND target_id=$2`,
          [actor.userId, v.targetId],
        );
      if (v.type === "block" && v.enabled)
        await c.query(
          "DELETE FROM user_follow WHERE (user_id=$1 AND target_id=$2) OR (user_id=$2 AND target_id=$1)",
          [actor.userId, v.targetId],
        );
    });
    return;
  }
  if (!(await getPost(actor, v.targetId)))
    throw new DomainError("NOT_FOUND", "Không tìm thấy bài viết.");
  if (v.type === "comment") {
    await db.query(
      "INSERT INTO post_comment(id,post_id,author_id,text) VALUES($1,$2,$3,$4)",
      [randomUUID(), v.targetId, actor.userId, v.text],
    );
    return;
  }
  const table = v.type === "like" ? "post_like" : "post_save";
  if (v.enabled)
    await db.query(
      `INSERT INTO ${table}(user_id,post_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,
      [actor.userId, v.targetId],
    );
  else
    await db.query(`DELETE FROM ${table} WHERE user_id=$1 AND post_id=$2`, [
      actor.userId,
      v.targetId,
    ]);
}
export async function removePost(actor: Actor, id: string) {
  await assertActiveActor(actor);
  const changed = await db.query(
    "UPDATE social_post SET status='hidden' WHERE id=$1 AND author_id=$2 RETURNING id",
    [id, actor.userId],
  );
  if (!changed.rowCount)
    throw new DomainError("NOT_FOUND", "Không tìm thấy bài của bạn.");
}
export async function saveProfile(actor: Actor, input: unknown): Promise<void> {
  await assertActiveActor(actor);
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(80),
      bio: z.string().trim().max(1000),
      avatarId: z.uuid().optional(),
    })
    .safeParse(input);
  if (!parsed.success)
    throw new DomainError("INVALID_INPUT", "Kiểm tra tên và phần giới thiệu.");
  const v = parsed.data;
  if (
    v.avatarId &&
    (await getReadyMedia(actor, [v.avatarId]))[0].kind !== "image"
  )
    throw new DomainError("INVALID_INPUT", "Ảnh đại diện cần là ảnh.");
  await withTransaction(async (c) => {
    await c.query('UPDATE "user" SET name=$2 WHERE id=$1', [
      actor.userId,
      v.name,
    ]);
    await c.query(
      "INSERT INTO user_profile(user_id,bio,avatar_id) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET bio=$2,avatar_id=$3",
      [actor.userId, v.bio, v.avatarId ?? null],
    );
  });
}
export async function listBlockedUsers(actor: Actor) {
  await assertActiveActor(actor);
  return (
    await db.query<{ id: string; name: string }>(
      'SELECT u.id,u.name FROM user_block b JOIN "user" u ON u.id=b.target_id WHERE b.user_id=$1 ORDER BY u.name',
      [actor.userId],
    )
  ).rows;
}
