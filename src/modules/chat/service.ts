import { z } from "zod";
import { randomUUID, createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { db, withTransaction } from "@/server/db";
import { consumeQuota } from "@/server/quota";
import { assertActiveActor } from "@/modules/access/service";
import { getReadyMedia } from "@/modules/media/service";
import { notifyUser } from "@/modules/notifications/service";
import { DomainError, type Actor, type Page } from "@/modules/shared/types";
export type Reference = { kind: "product" | "post" | "order"; id: string };
export type ConversationView = {
  id: string;
  peerId: string;
  peerName: string;
  avatarId: string | null;
  counter: string;
  peerRead: string;
  readPosition: string;
  blocked: boolean;
  peerActive: boolean;
};
export type ChatMessage = {
  id: string;
  senderId: string;
  position: string;
  text: string;
  mediaId: string | null;
  reference: (Reference & { label: string; href: string | null }) | null;
  createdAt: string;
  hidden: boolean;
};
export async function getConversation(
  actor: Actor,
  id: string,
): Promise<ConversationView> {
  await assertActiveActor(actor);
  if (!z.uuid().safeParse(id).success)
    throw new DomainError("NOT_FOUND", "Không tìm thấy cuộc trò chuyện.");
  const row = (
    await db.query<ConversationView>(
      `SELECT c.id,u.id AS "peerId",u.name AS "peerName",p.avatar_id AS "avatarId",c.counter::text,CASE WHEN c.first_id=$2 THEN c.second_read ELSE c.first_read END::text AS "peerRead",CASE WHEN c.first_id=$2 THEN c.first_read ELSE c.second_read END::text AS "readPosition",EXISTS(SELECT 1 FROM user_block b WHERE (b.user_id=c.first_id AND b.target_id=c.second_id) OR (b.user_id=c.second_id AND b.target_id=c.first_id)) AS blocked,(u."emailVerified" AND NOT EXISTS(SELECT 1 FROM account_state s WHERE s.user_id=u.id AND s.suspended=true)) AS "peerActive" FROM conversation c JOIN "user" u ON u.id=CASE WHEN c.first_id=$2 THEN c.second_id ELSE c.first_id END LEFT JOIN user_profile p ON p.user_id=u.id WHERE c.id=$1 AND (c.first_id=$2 OR c.second_id=$2)`,
      [id, actor.userId],
    )
  ).rows[0];
  if (!row)
    throw new DomainError("NOT_FOUND", "Không tìm thấy cuộc trò chuyện.");
  if (row.blocked) row.peerRead = "0";
  return row;
}
export async function openConversation(
  actor: Actor,
  peerId: string,
): Promise<string> {
  await assertActiveActor(actor);
  if (!z.uuid().safeParse(peerId).success || peerId === actor.userId)
    throw new DomainError("INVALID_INPUT", "Chọn người nhận hợp lệ.");
  const reachable = (
    await db.query(
      'SELECT u.id FROM "user" u WHERE u.id=$2 AND u."emailVerified"=true AND NOT EXISTS(SELECT 1 FROM account_state s WHERE s.user_id=u.id AND s.suspended=true) AND NOT EXISTS(SELECT 1 FROM user_block b WHERE (b.user_id=$1 AND b.target_id=$2) OR (b.user_id=$2 AND b.target_id=$1))',
      [actor.userId, peerId],
    )
  ).rowCount;
  if (!reachable)
    throw new DomainError(
      "NOT_FOUND",
      "Không thể bắt đầu trò chuyện với tài khoản này.",
    );
  const [first, second] = [actor.userId, peerId].sort();
  return (
    await db.query(
      "INSERT INTO conversation(id,first_id,second_id) VALUES($1,$2,$3) ON CONFLICT(first_id,second_id) DO UPDATE SET first_id=excluded.first_id RETURNING id",
      [randomUUID(), first, second],
    )
  ).rows[0].id;
}
async function referenceCard(
  client: Pick<PoolClient, "query">,
  viewer: string,
  peer: string,
  ref: Reference,
): Promise<(Reference & { label: string; href: string | null }) | null> {
  if (ref.kind === "product") {
    const row = (
      await client.query(
        "SELECT p.name FROM product p JOIN shop s ON s.id=p.shop_id WHERE p.id=$1 AND p.status='published' AND s.status='approved'",
        [ref.id],
      )
    ).rows[0];
    return row
      ? { ...ref, label: row.name, href: `/products/${ref.id}` }
      : null;
  }
  if (ref.kind === "post") {
    const row = (
      await client.query(
        `SELECT substring(p.text,1,120) AS text FROM social_post p JOIN "user" u ON u.id=p.author_id WHERE p.id=$1 AND p.status='published' AND NOT EXISTS(SELECT 1 FROM account_state a WHERE a.user_id=u.id AND a.suspended=true) AND NOT EXISTS(SELECT 1 FROM user_block b WHERE (b.user_id=$2 AND b.target_id=p.author_id) OR (b.target_id=$2 AND b.user_id=p.author_id))`,
        [ref.id, viewer],
      )
    ).rows[0];
    return row ? { ...ref, label: row.text, href: `/posts/${ref.id}` } : null;
  }
  const row = (
    await client.query(
      "SELECT o.id FROM shop_order o JOIN checkout c ON c.id=o.checkout_id JOIN shop s ON s.id=o.shop_id WHERE o.id=$1 AND ((c.buyer_id=$2 AND s.owner_user_id=$3) OR (c.buyer_id=$3 AND s.owner_user_id=$2))",
      [ref.id, viewer, peer],
    )
  ).rows[0];
  return row
    ? {
        ...ref,
        label: `Đơn hàng ${ref.id.slice(0, 8)}`,
        href: `/orders/${ref.id}`,
      }
    : null;
}
const messageSchema = z
  .object({
    conversationId: z.uuid(),
    text: z.string().trim().max(2000).default(""),
    mediaId: z.uuid().optional(),
    reference: z
      .object({ kind: z.enum(["product", "post", "order"]), id: z.uuid() })
      .optional(),
  })
  .refine((v) => Boolean(v.text || v.mediaId || v.reference));
export async function sendMessage(
  actor: Actor,
  input: unknown,
  clientMessageId: string,
): Promise<string> {
  await assertActiveActor(actor);
  const parsed = messageSchema.safeParse(input);
  if (!parsed.success || !z.uuid().safeParse(clientMessageId).success)
    throw new DomainError(
      "INVALID_INPUT",
      "Nhập tin nhắn, ảnh hoặc thẻ chia sẻ hợp lệ.",
    );
  const v = parsed.data,
    room = await getConversation(actor, v.conversationId);
  if (
    v.mediaId &&
    (await getReadyMedia(actor, [v.mediaId]))[0].kind !== "image"
  )
    throw new DomainError(
      "INVALID_INPUT",
      "Tin nhắn hỗ trợ ảnh JPG, PNG hoặc WebP.",
    );
  await consumeQuota(actor.userId, "message", 60, 60);
  const digest = createHash("sha256").update(JSON.stringify(v)).digest("hex");
  return withTransaction(async (c) => {
    const locked = (
      await c.query(
        "SELECT * FROM conversation WHERE id=$1 AND (first_id=$2 OR second_id=$2) FOR UPDATE",
        [v.conversationId, actor.userId],
      )
    ).rows[0];
    if (!locked)
      throw new DomainError("NOT_FOUND", "Không tìm thấy cuộc trò chuyện.");
    const old = (
      await c.query(
        "SELECT id,payload_hash FROM chat_message WHERE conversation_id=$1 AND sender_id=$2 AND client_message_id=$3",
        [v.conversationId, actor.userId, clientMessageId],
      )
    ).rows[0];
    if (old) {
      if (old.payload_hash !== digest)
        throw new DomainError(
          "CONFLICT",
          "Mã tin nhắn đã được dùng cho nội dung khác.",
        );
      return old.id;
    }
    if (
      (
        await c.query(
          "SELECT 1 FROM user_block WHERE (user_id=$1 AND target_id=$2) OR (user_id=$2 AND target_id=$1)",
          [actor.userId, room.peerId],
        )
      ).rowCount ||
      !room.peerActive
    )
      throw new DomainError(
        "FORBIDDEN",
        "Không thể gửi tin mới trong cuộc trò chuyện này.",
      );
    if (
      v.reference &&
      !(await referenceCard(c, actor.userId, room.peerId, v.reference))
    )
      throw new DomainError(
        "FORBIDDEN",
        "Không được chia sẻ nội dung hoặc đơn hàng này với người nhận.",
      );
    const id = randomUUID(),
      position = (BigInt(locked.counter) + 1n).toString();
    await c.query(
      "INSERT INTO chat_message(id,conversation_id,sender_id,position,text,media_id,reference,client_message_id,payload_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [
        id,
        v.conversationId,
        actor.userId,
        position,
        v.text,
        v.mediaId ?? null,
        v.reference ? JSON.stringify(v.reference) : null,
        clientMessageId,
        digest,
      ],
    );
    await c.query(
      "UPDATE conversation SET counter=counter+1,updated_at=clock_timestamp() WHERE id=$1",
      [v.conversationId],
    );
    await notifyUser(
      room.peerId,
      {
        eventKey: `chat:${id}`,
        title: "Bạn có tin nhắn mới",
        href: `/messages/${v.conversationId}`,
      },
      c,
    );
    return id;
  });
}
export async function listMessages(
  actor: Actor,
  conversationId: string,
  cursor?: string,
): Promise<Page<ChatMessage>> {
  const room = await getConversation(actor, conversationId);
  if (cursor && !/^\d{1,18}$/.test(cursor))
    throw new DomainError("INVALID_INPUT", "Trang tin nhắn không hợp lệ.");
  const rows = (
    await db.query<{
      id: string;
      senderId: string;
      position: string;
      text: string;
      mediaId: string | null;
      reference: Reference | null;
      createdAt: Date;
      hidden: boolean;
    }>(
      'SELECT id,sender_id AS "senderId",position::text,text,media_id AS "mediaId",reference,created_at AS "createdAt",hidden FROM chat_message WHERE conversation_id=$1 AND ($2::bigint IS NULL OR position<$2::bigint) ORDER BY chat_message.position DESC LIMIT 51',
      [conversationId, cursor ?? null],
    )
  ).rows;
  const items: ChatMessage[] = [];
  for (const row of rows.slice(0, 50).reverse()) {
    const reference =
      row.reference && !row.hidden
        ? ((await referenceCard(
            db,
            actor.userId,
            room.peerId,
            row.reference,
          )) ?? {
            ...row.reference,
            label: "Nội dung không còn khả dụng",
            href: null,
          })
        : null;
    items.push({
      ...row,
      text: row.hidden ? "Tin nhắn đã được ẩn" : row.text,
      mediaId: row.hidden ? null : row.mediaId,
      createdAt: row.createdAt.toISOString(),
      reference,
    });
  }
  return { items, nextCursor: rows.length > 50 ? items[0].position : null };
}
export async function markRead(
  actor: Actor,
  id: string,
  position: string,
): Promise<void> {
  await getConversation(actor, id);
  if (!/^\d{1,18}$/.test(position))
    throw new DomainError("INVALID_INPUT", "Vị trí đọc chưa hợp lệ.");
  await db.query(
    "UPDATE conversation SET first_read=CASE WHEN first_id=$2 THEN greatest(first_read,least(counter,$3::bigint)) ELSE first_read END,second_read=CASE WHEN second_id=$2 THEN greatest(second_read,least(counter,$3::bigint)) ELSE second_read END WHERE id=$1 AND (first_id=$2 OR second_id=$2)",
    [id, actor.userId, position],
  );
}
export async function listConversations(actor: Actor) {
  await assertActiveActor(actor);
  return (
    await db.query<{
      id: string;
      peerId: string;
      peerName: string;
      unread: number;
    }>(
      `SELECT c.id,u.id AS "peerId",u.name AS "peerName",(SELECT count(*)::int FROM chat_message m WHERE m.conversation_id=c.id AND m.sender_id<>$1 AND m.position>CASE WHEN c.first_id=$1 THEN c.first_read ELSE c.second_read END) AS unread FROM conversation c JOIN "user" u ON u.id=CASE WHEN c.first_id=$1 THEN c.second_id ELSE c.first_id END WHERE c.first_id=$1 OR c.second_id=$1 ORDER BY c.updated_at DESC,c.id`,
      [actor.userId],
    )
  ).rows;
}
