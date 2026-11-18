import type { PoolClient } from "pg";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db, withTransaction } from "@/server/db";
import { assertActiveActor, requirePermission } from "@/modules/access/service";
import { DomainError, type Actor } from "@/modules/shared/types";
export const shopApplicationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(10).max(2000),
  phone: z
    .string()
    .trim()
    .regex(/^(0[35789]\d{8}|\+84[35789]\d{8})$/),
  address: z.string().trim().min(10).max(500),
  legalName: z.string().trim().min(3).max(160),
  bankName: z.string().trim().min(3).max(120),
  bankAccount: z
    .string()
    .trim()
    .regex(/^\d{6,30}$/),
  bankHolder: z.string().trim().min(3).max(160),
});
export type ShopApplication = z.infer<typeof shopApplicationSchema>;
export type Shop = {
  id: string;
  ownerUserId: string;
  name: string;
  description: string;
  phone: string;
  address: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  reviewReason: string | null;
};
export type OwnShop = Shop & {
  legalName: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
};
export type ShopReview = Shop & {
  legalName: string;
  bankName: string;
  bankAccountLast4: string;
  bankHolder: string;
};
const shopColumns =
  's.id,s.owner_user_id AS "ownerUserId",s.name,s.description,s.phone,s.address,s.status,s.review_reason AS "reviewReason"';
export async function applyForShop(
  actor: Actor,
  input: unknown,
): Promise<string> {
  await assertActiveActor(actor);
  const parsed = shopApplicationSchema.safeParse(input);
  if (!parsed.success)
    throw new DomainError(
      "INVALID_INPUT",
      "Kiểm tra tên shop, số điện thoại Việt Nam, địa chỉ và thông tin nhận tiền.",
    );
  const value = parsed.data;
  return withTransaction(async (client) => {
    const result = await client.query<{ id: string }>(
      "INSERT INTO shop(id,owner_user_id,name,description,phone,address) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(owner_user_id) DO UPDATE SET name=$3,description=$4,phone=$5,address=$6,status='pending',review_reason=null,reviewed_at=null WHERE shop.status='rejected' RETURNING id",
      [
        randomUUID(),
        actor.userId,
        value.name,
        value.description,
        value.phone,
        value.address,
      ],
    );
    const shop = result.rows[0];
    if (!shop)
      throw new DomainError(
        "CONFLICT",
        "Bạn đã có hồ sơ gian hàng. Vui lòng xem trạng thái xét duyệt.",
      );
    await client.query(
      "INSERT INTO shop_verification(shop_id,legal_name,bank_name,bank_account,bank_holder) VALUES($1,$2,$3,$4,$5) ON CONFLICT(shop_id) DO UPDATE SET legal_name=$2,bank_name=$3,bank_account=$4,bank_holder=$5,submitted_at=now()",
      [
        shop.id,
        value.legalName,
        value.bankName,
        value.bankAccount,
        value.bankHolder,
      ],
    );
    await client.query(
      "INSERT INTO audit_event(id,actor_id,action,target_id) VALUES($1,$2,'shop.application',$3)",
      [randomUUID(), actor.userId, shop.id],
    );
    return shop.id;
  });
}
export async function getOwnShop(actor: Actor): Promise<OwnShop | null> {
  await assertActiveActor(actor);
  return (
    (
      await db.query<OwnShop>(
        `SELECT ${shopColumns},v.legal_name AS "legalName",v.bank_name AS "bankName",v.bank_account AS "bankAccount",v.bank_holder AS "bankHolder" FROM shop s JOIN shop_verification v ON v.shop_id=s.id WHERE s.owner_user_id=$1`,
        [actor.userId],
      )
    ).rows[0] ?? null
  );
}
export async function requireApprovedShop(
  actor: Actor,
  shopId: string,
): Promise<void> {
  await assertActiveActor(actor);
  const result = await db.query(
    "SELECT 1 FROM shop WHERE id=$1 AND owner_user_id=$2 AND status='approved'",
    [shopId, actor.userId],
  );
  if (!result.rowCount)
    throw new DomainError(
      "FORBIDDEN",
      "Gian hàng chưa được duyệt hoặc không thuộc tài khoản của bạn.",
    );
}
// shortcut: Admin shop review returns at most 100 rows; add server pagination for larger queues.
export async function listShopApplications(
  actor: Actor,
): Promise<ShopReview[]> {
  await requirePermission(actor, "shops.review");
  return (
    await db.query<ShopReview>(
      `SELECT ${shopColumns},v.legal_name AS "legalName",v.bank_name AS "bankName",right(v.bank_account,4) AS "bankAccountLast4",v.bank_holder AS "bankHolder" FROM shop s JOIN shop_verification v ON v.shop_id=s.id ORDER BY s.created_at DESC LIMIT 100`,
    )
  ).rows;
}
export async function reviewShop(
  actor: Actor,
  shopId: string,
  decision: string,
  reason: string,
): Promise<void> {
  await requirePermission(actor, "shops.review");
  if (
    !["approve", "reject"].includes(decision) ||
    reason.trim().length < 10 ||
    reason.length > 1000
  )
    throw new DomainError(
      "INVALID_INPUT",
      "Chọn quyết định và ghi lý do xét duyệt ít nhất 10 ký tự.",
    );
  await withTransaction(async (client) => {
    const shop = (
      await client.query(
        "SELECT owner_user_id,status FROM shop WHERE id=$1 FOR UPDATE",
        [shopId],
      )
    ).rows[0];
    if (!shop) throw new DomainError("NOT_FOUND", "Không tìm thấy gian hàng.");
    if (
      decision === "approve" &&
      (
        await client.query(
          "SELECT 1 FROM account_state WHERE user_id=$1 AND suspended=true",
          [shop.owner_user_id],
        )
      ).rowCount
    )
      throw new DomainError("CONFLICT", "Chủ gian hàng đang bị tạm khóa.");
    if (shop.status !== "pending")
      throw new DomainError("CONFLICT", "Hồ sơ không còn chờ duyệt.");
    await client.query(
      "UPDATE shop SET status=$2,review_reason=$3,reviewed_at=now() WHERE id=$1",
      [shopId, decision === "approve" ? "approved" : "rejected", reason.trim()],
    );
    await client.query(
      "INSERT INTO audit_event(id,actor_id,action,target_id,details) VALUES($1,$2,'shop.review',$3,$4)",
      [
        randomUUID(),
        actor.userId,
        shopId,
        JSON.stringify({ decision, reason: reason.trim() }),
      ],
    );
  });
}

export async function setShopSuspension(
  client: PoolClient,
  actor: Actor,
  id: string,
  suspended: boolean,
  reason: string,
) {
  const shop = (
    await client.query("SELECT * FROM shop WHERE id=$1 FOR UPDATE", [id])
  ).rows[0];
  if (!shop) throw new DomainError("NOT_FOUND", "Không tìm thấy gian hàng.");
  if (suspended) {
    if (shop.status === "suspended") return;
    await client.query(
      "UPDATE shop SET suspended_from=status,status='suspended',review_reason=$2 WHERE id=$1",
      [id, reason],
    );
  } else {
    if (shop.status !== "suspended")
      throw new DomainError(
        "CONFLICT",
        "Gian hàng không ở trạng thái tạm khóa.",
      );
    if (
      (
        await client.query(
          "SELECT 1 FROM account_state WHERE user_id=$1 AND suspended=true",
          [shop.owner_user_id],
        )
      ).rowCount
    )
      throw new DomainError(
        "CONFLICT",
        "Cần mở khóa tài khoản chủ shop trước.",
      );
    await client.query(
      "UPDATE shop SET status=coalesce(suspended_from,'pending'),suspended_from=null,review_reason=$2 WHERE id=$1",
      [id, reason],
    );
  }
  await client.query(
    "INSERT INTO audit_event(id,actor_id,action,target_id,details) VALUES($1,$2,'shop.suspension',$3,$4)",
    [randomUUID(), actor.userId, id, JSON.stringify({ suspended, reason })],
  );
}
export async function changeShopSuspension(
  actor: Actor,
  id: string,
  suspended: boolean,
  reason: string,
) {
  await requirePermission(actor, "shops.review");
  if (reason.trim().length < 10 || reason.length > 1000)
    throw new DomainError("INVALID_INPUT", "Ghi rõ lý do ít nhất 10 ký tự.");
  await withTransaction((client) =>
    setShopSuspension(client, actor, id, suspended, reason.trim()),
  );
}
