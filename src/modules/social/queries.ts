import { z } from "zod";
import { db } from "@/server/db";
import { assertActiveActor } from "@/modules/access/service";
import { DomainError, type Actor, type Page } from "@/modules/shared/types";
import { normalizeSearch } from "@/modules/catalog/schema";
export type PostCard = {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  avatarId: string | null;
  createdAt: string;
  topics: string[];
  likes: number;
  commentCount: number;
  liked: boolean;
  saved: boolean;
  following: boolean;
  media: { id: string; kind: "image" | "video" }[];
  products: {
    id: string;
    name: string;
    available: boolean;
    price: string | null;
    coverId: string | null;
  }[];
};
const visibility = `p.status='published' AND u."emailVerified"=true AND NOT EXISTS(SELECT 1 FROM account_state a WHERE a.user_id=u.id AND a.suspended=true) AND NOT EXISTS(SELECT 1 FROM user_block b WHERE (b.user_id=$1 AND b.target_id=p.author_id) OR (b.target_id=$1 AND b.user_id=p.author_id))`;
const columns = `p.id,p.text,p.author_id AS "authorId",u.name AS "authorName",pr.avatar_id AS "avatarId",to_char(p.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "createdAt",p.topics,(SELECT count(*)::int FROM post_like l WHERE l.post_id=p.id) AS likes,(SELECT count(*)::int FROM post_comment c WHERE c.post_id=p.id AND c.hidden=false AND NOT EXISTS(SELECT 1 FROM account_state inactive WHERE inactive.user_id=c.author_id AND inactive.suspended=true)) AS "commentCount",EXISTS(SELECT 1 FROM post_like l WHERE l.post_id=p.id AND l.user_id=$1) AS liked,EXISTS(SELECT 1 FROM post_save s WHERE s.post_id=p.id AND s.user_id=$1) AS saved,EXISTS(SELECT 1 FROM user_follow f WHERE f.user_id=$1 AND f.target_id=p.author_id) AS following,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.id,'kind',m.kind) ORDER BY pm.position),'[]') FROM post_media pm JOIN media m ON m.id=pm.media_id WHERE pm.post_id=p.id AND m.status='ready') AS media,
 (SELECT coalesce(jsonb_agg(jsonb_build_object(
   'id',q.id,
   'name',CASE WHEN q.status='published' AND s.status='approved' THEN q.name ELSE 'Sản phẩm tạm ngừng bán' END,
   'available',q.status='published' AND s.status='approved',
   'price',CASE WHEN q.status='published' AND s.status='approved' THEN (SELECT min(v.price)::text FROM product_variant v WHERE v.product_id=q.id AND v.active) END,
   'coverId',CASE WHEN q.status='published' AND s.status='approved' THEN (SELECT pm.media_id FROM product_media pm JOIN media m ON m.id=pm.media_id WHERE pm.product_id=q.id AND m.kind='image' AND m.status='ready' ORDER BY pm.position LIMIT 1) END
 ) ORDER BY q.id),'[]') FROM post_product pp JOIN product q ON q.id=pp.product_id JOIN shop s ON s.id=q.shop_id WHERE pp.post_id=p.id) AS products`;
const from =
  'FROM social_post p JOIN "user" u ON u.id=p.author_id LEFT JOIN user_profile pr ON pr.user_id=u.id';
export async function listFeed(
  actor: Actor | null,
  input: unknown,
): Promise<Page<PostCard>> {
  if (actor) await assertActiveActor(actor);
  const parsed = z
    .object({
      mode: z.enum(["explore", "following", "saved"]).default("explore"),
      query: z.string().max(300).optional(),
      authorId: z.uuid().optional(),
      productId: z.uuid().optional(),
      limit: z.number().int().min(1).max(50).default(20),
      cursor: z.string().max(512).optional(),
    })
    .safeParse(input);
  if (!parsed.success)
    throw new DomainError("INVALID_INPUT", "Bộ lọc bài viết không hợp lệ.");
  const q = parsed.data;
  if (q.mode !== "explore" && !actor)
    throw new DomainError(
      "UNAUTHENTICATED",
      "Đăng nhập để xem nội dung đã theo dõi hoặc lưu.",
    );
  const values: unknown[] = [actor?.userId ?? null];
  const bind = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };
  const where = [visibility];
  if (q.mode === "following")
    where.push(
      "EXISTS(SELECT 1 FROM user_follow f WHERE f.user_id=$1 AND f.target_id=p.author_id)",
    );
  if (q.mode === "saved")
    where.push(
      "EXISTS(SELECT 1 FROM post_save s WHERE s.user_id=$1 AND s.post_id=p.id)",
    );
  if (q.authorId) where.push(`p.author_id=${bind(q.authorId)}`);
  if (q.productId)
    where.push(
      `EXISTS(SELECT 1 FROM post_product linked WHERE linked.post_id=p.id AND linked.product_id=${bind(q.productId)})`,
    );
  if (q.query?.trim())
    where.push(
      `to_tsvector('simple',p.search_text) @@ plainto_tsquery('simple',${bind(normalizeSearch(q.query))})`,
    );
  if (q.cursor) {
    let decoded;
    try {
      decoded = z
        .object({ time: z.iso.datetime(), id: z.uuid() })
        .parse(JSON.parse(Buffer.from(q.cursor, "base64url").toString("utf8")));
    } catch {
      throw new DomainError("INVALID_INPUT", "Trang bài viết không hợp lệ.");
    }
    where.push(
      `(p.created_at,p.id)<(${bind(decoded.time)}::timestamptz,${bind(decoded.id)})`,
    );
  }
  const result = (
    await db.query<PostCard>(
      `SELECT ${columns} ${from} WHERE ${where.join(" AND ")} ORDER BY p.created_at DESC,p.id DESC LIMIT ${bind(q.limit + 1)}`,
      values,
    )
  ).rows;
  const items = result.slice(0, q.limit),
    last = items.at(-1);
  return {
    items,
    nextCursor:
      result.length > q.limit && last
        ? Buffer.from(
            JSON.stringify({ time: last.createdAt, id: last.id }),
          ).toString("base64url")
        : null,
  };
}
export async function getPost(actor: Actor | null, id: string) {
  if (actor) await assertActiveActor(actor);
  if (!z.uuid().safeParse(id).success) return null;
  const post = (
    await db.query<PostCard>(
      `SELECT ${columns} ${from} WHERE ${visibility} AND p.id=$2`,
      [actor?.userId ?? null, id],
    )
  ).rows[0];
  if (!post) return null;
  const comments = (
    await db.query<{
      id: string;
      authorId: string;
      authorName: string;
      text: string;
    }>(
      'SELECT c.id,c.author_id AS "authorId",u.name AS "authorName",c.text FROM post_comment c JOIN "user" u ON u.id=c.author_id WHERE c.post_id=$2 AND c.hidden=false AND NOT EXISTS(SELECT 1 FROM account_state inactive WHERE inactive.user_id=c.author_id AND inactive.suspended=true) AND NOT EXISTS(SELECT 1 FROM user_block b WHERE (b.user_id=$1 AND b.target_id=c.author_id) OR (b.target_id=$1 AND b.user_id=c.author_id)) ORDER BY c.created_at,c.id LIMIT 100',
      [actor?.userId ?? null, id],
    )
  ).rows;
  return { ...post, comments };
}
export async function getPublicProfile(actor: Actor | null, id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  return (
    (
      await db.query<{
        id: string;
        name: string;
        bio: string;
        avatarId: string | null;
        followers: number;
        following: number;
        isFollowing: boolean;
      }>(
        'SELECT u.id,u.name,coalesce(p.bio,\'\') AS bio,p.avatar_id AS "avatarId",(SELECT count(*)::int FROM user_follow f WHERE f.target_id=u.id) AS followers,(SELECT count(*)::int FROM user_follow f WHERE f.user_id=u.id) AS following,EXISTS(SELECT 1 FROM user_follow f WHERE f.user_id=$1 AND f.target_id=u.id) AS "isFollowing" FROM "user" u LEFT JOIN user_profile p ON p.user_id=u.id WHERE u.id=$2 AND u."emailVerified"=true AND NOT EXISTS(SELECT 1 FROM account_state s WHERE s.user_id=u.id AND s.suspended=true) AND NOT EXISTS(SELECT 1 FROM user_block b WHERE (b.user_id=$1 AND b.target_id=u.id) OR (b.target_id=$1 AND b.user_id=u.id))',
        [actor?.userId ?? null, id],
      )
    ).rows[0] ?? null
  );
}
