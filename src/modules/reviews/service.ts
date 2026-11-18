import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db } from "@/server/db";
import { assertActiveActor } from "@/modules/access/service";
import { DomainError, type Actor } from "@/modules/shared/types";
export async function submitReview(
  actor: Actor,
  itemId: string,
  input: unknown,
): Promise<string> {
  await assertActiveActor(actor);
  const row = (
    await db.query(
      "SELECT c.buyer_id,o.status FROM order_item i JOIN shop_order o ON o.id=i.order_id JOIN checkout c ON c.id=o.checkout_id WHERE i.id=$1",
      [itemId],
    )
  ).rows[0];
  if (!row || row.buyer_id !== actor.userId)
    throw new DomainError(
      "FORBIDDEN",
      "Chỉ người mua của sản phẩm được đánh giá.",
    );
  if (row.status !== "received")
    throw new DomainError("CONFLICT", "Bạn có thể đánh giá sau khi nhận hàng.");
  const parsed = z
    .object({
      rating: z.number().int().min(1).max(5),
      text: z.string().trim().min(3).max(2000),
    })
    .safeParse(input);
  if (!parsed.success)
    throw new DomainError(
      "INVALID_INPUT",
      "Chọn 1–5 sao và viết đánh giá từ 3 đến 2000 ký tự.",
    );
  const id = randomUUID();
  try {
    await db.query(
      "INSERT INTO purchase_review(id,order_item_id,author_id,rating,text) VALUES($1,$2,$3,$4,$5)",
      [id, itemId, actor.userId, parsed.data.rating, parsed.data.text],
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    )
      throw new DomainError(
        "CONFLICT",
        "Bạn đã đánh giá sản phẩm trong đơn này.",
      );
    throw error;
  }
  return id;
}
export async function getPublicReviews(productId: string) {
  return (
    await db.query<{ id: string; rating: number; text: string; name: string }>(
      'SELECT r.id,r.rating,r.text,u.name FROM purchase_review r JOIN order_item i ON i.id=r.order_item_id JOIN "user" u ON u.id=r.author_id WHERE i.product_id=$1 AND r.hidden=false ORDER BY r.created_at DESC LIMIT 30',
      [productId],
    )
  ).rows;
}
