import { checkoutSource } from "@/modules/reporting/service";
import { z } from "zod";
import { randomUUID, createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { db, withTransaction } from "@/server/db";
import { assertActiveActor } from "@/modules/access/service";
import {
  getActivePolicy,
  type TradingPolicy,
} from "@/modules/policies/service";
import { regionKey } from "@/modules/shipping/service";
import { DomainError, type Actor } from "@/modules/shared/types";
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const addressSchema = z.object({
  name: z.string().trim().min(2).max(160),
  phone: z.string().regex(/^(0[35789]\d{8}|\+84[35789]\d{8})$/),
  region: z.string().trim().min(2).max(100),
  line: z.string().trim().min(10).max(500),
});
export type Address = z.infer<typeof addressSchema>;
export type CartLine = {
  variantId: string;
  productId: string;
  shopId: string;
  shopName: string;
  name: string;
  label: string;
  quantity: number;
  unitPrice: string;
  stock: number;
  reserved: number;
  productStatus: string;
  shopStatus: string;
  attributes: Record<string, string | number>;
};
export type CheckoutQuote = {
  token: string;
  total: string;
  lines: CartLine[];
  policy: TradingPolicy;
  shops: {
    shopId: string;
    shopName: string;
    subtotal: string;
    shipping: string;
    total: string;
    estimatedDays: number;
  }[];
};
export type Checkout = {
  id: string;
  total: string;
  status: string;
  expiresAt: string;
  orders: {
    id: string;
    shopId: string;
    subtotal: string;
    shipping: string;
    status: string;
  }[];
};
async function lockCart(client: PoolClient, actor: Actor) {
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtextextended($1,1937195))",
    [actor.userId],
  );
}
async function changeCartItem(
  actor: Actor,
  variantId: string,
  quantity: number,
  operation: "set" | "add",
): Promise<void> {
  await assertActiveActor(actor);
  if (
    !z.uuid().safeParse(variantId).success ||
    !Number.isInteger(quantity) ||
    quantity < 0 ||
    quantity > 99
  )
    throw new DomainError(
      "INVALID_INPUT",
      "Số lượng phải là số nguyên từ 0 đến 99.",
    );
  await withTransaction(async (client) => {
    await lockCart(client, actor);
    if (quantity === 0 && operation === "add")
      throw new DomainError("INVALID_INPUT", "Số lượng thêm phải lớn hơn 0.");
    if (quantity === 0) {
      await client.query(
        "DELETE FROM cart_item WHERE user_id=$1 AND variant_id=$2",
        [actor.userId, variantId],
      );
      return;
    }
    const row = (
      await client.query(
        "SELECT v.id FROM product_variant v JOIN product p ON p.id=v.product_id JOIN shop s ON s.id=p.shop_id WHERE v.id=$1 AND v.active=true AND p.status='published' AND s.status='approved'",
        [variantId],
      )
    ).rows[0];
    if (!row)
      throw new DomainError("CONFLICT", "Sản phẩm không còn được mở bán.");
    const count = (
      await client.query(
        "SELECT count(*)::int AS count FROM cart_item WHERE user_id=$1",
        [actor.userId],
      )
    ).rows[0].count;
    if (
      count >= 100 &&
      !(
        await client.query(
          "SELECT 1 FROM cart_item WHERE user_id=$1 AND variant_id=$2",
          [actor.userId, variantId],
        )
      ).rowCount
    )
      throw new DomainError("CONFLICT", "Giỏ hàng tối đa 100 biến thể.");
    const next =
      operation === "add"
        ? ((
            await client.query(
              "SELECT quantity FROM cart_item WHERE user_id=$1 AND variant_id=$2",
              [actor.userId, variantId],
            )
          ).rows[0]?.quantity ?? 0)
        : 0;
    if (next + quantity > 99)
      throw new DomainError(
        "INVALID_INPUT",
        "Số lượng tối đa 99 cho mỗi biến thể.",
      );
    await client.query(
      "INSERT INTO cart_item(user_id,variant_id,quantity) VALUES($1,$2,$3) ON CONFLICT(user_id,variant_id) DO UPDATE SET quantity=$3",
      [actor.userId, variantId, next + quantity],
    );
  });
}
async function cartLines(
  client: Pick<PoolClient, "query">,
  actor: Actor,
): Promise<CartLine[]> {
  return (
    await client.query<CartLine>(
      'SELECT v.id AS "variantId",p.id AS "productId",s.id AS "shopId",s.name AS "shopName",p.name,v.label,c.quantity,v.price::text AS "unitPrice",v.stock,v.reserved,CASE WHEN v.active THEN p.status ELSE \'hidden\' END AS "productStatus",s.status AS "shopStatus",p.attributes FROM cart_item c JOIN product_variant v ON v.id=c.variant_id JOIN product p ON p.id=v.product_id JOIN shop s ON s.id=p.shop_id WHERE c.user_id=$1 ORDER BY v.id',
      [actor.userId],
    )
  ).rows;
}
export async function getCart(actor: Actor): Promise<CartLine[]> {
  await assertActiveActor(actor);
  return cartLines(db, actor);
}
async function buildQuote(
  client: Pick<PoolClient, "query">,
  actor: Actor,
  region: string,
): Promise<CheckoutQuote> {
  const lines = await cartLines(client, actor);
  if (!lines.length) throw new DomainError("CONFLICT", "Giỏ hàng đang trống.");
  for (const line of lines)
    if (
      line.productStatus !== "published" ||
      line.shopStatus !== "approved" ||
      line.stock - line.reserved < line.quantity
    )
      throw new DomainError(
        "CONFLICT",
        `${line.name} không còn đủ hàng hoặc đã ngừng bán.`,
      );
  const policy = await getActivePolicy(client);
  const shops: CheckoutQuote["shops"] = [];
  for (const shopId of [...new Set(lines.map((x) => x.shopId))].sort()) {
    const rate = (
      await client.query<{ fee: string; estimatedDays: number }>(
        "SELECT fee::text,estimated_days AS \"estimatedDays\" FROM shipping_rate WHERE shop_id=$1 AND region IN ($2,'*') ORDER BY (region=$2) DESC LIMIT 1",
        [shopId, regionKey(region)],
      )
    ).rows[0];
    if (!rate)
      throw new DomainError(
        "CONFLICT",
        `Gian hàng ${lines.find((x) => x.shopId === shopId)!.shopName} chưa hỗ trợ khu vực nhận hàng này.`,
      );
    const subset = lines.filter((x) => x.shopId === shopId),
      subtotal = subset.reduce(
        (sum, x) => sum + BigInt(x.unitPrice) * BigInt(x.quantity),
        0n,
      );
    shops.push({
      shopId,
      shopName: subset[0].shopName,
      subtotal: subtotal.toString(),
      shipping: rate.fee,
      total: (subtotal + BigInt(rate.fee)).toString(),
      estimatedDays: rate.estimatedDays,
    });
  }
  const token = hash({
    lines: lines.map(
      ({ variantId, quantity, unitPrice, name, label, attributes }) => ({
        variantId,
        quantity,
        unitPrice,
        name,
        label,
        attributes,
      }),
    ),
    shops,
    policyId: policy.id,
    region: regionKey(region),
  });
  return {
    token,
    total: shops.reduce((sum, s) => sum + BigInt(s.total), 0n).toString(),
    lines,
    shops,
    policy,
  };
}
export async function quoteCart(
  actor: Actor,
  input: unknown,
): Promise<CheckoutQuote> {
  await assertActiveActor(actor);
  const parsed = z
    .object({ region: z.string().trim().min(2).max(100) })
    .safeParse(input);
  if (!parsed.success)
    throw new DomainError("INVALID_INPUT", "Điền tỉnh/thành nhận hàng.");
  return buildQuote(db, actor, parsed.data.region);
}
async function readCheckout(
  client: Pick<PoolClient, "query">,
  id: string,
): Promise<Checkout> {
  const row = (
    await client.query<{
      id: string;
      total: string;
      status: string;
      expires_at: Date;
    }>("SELECT id,total::text,status,expires_at FROM checkout WHERE id=$1", [
      id,
    ])
  ).rows[0];
  if (!row) throw new DomainError("NOT_FOUND", "Không tìm thấy đơn.");
  return {
    id: row.id,
    total: row.total,
    status: row.status,
    expiresAt: row.expires_at.toISOString(),
    orders: (
      await client.query<{
        id: string;
        shopId: string;
        subtotal: string;
        shipping: string;
        status: string;
      }>(
        'SELECT id,shop_id AS "shopId",subtotal::text,shipping::text,status FROM shop_order WHERE checkout_id=$1 ORDER BY id',
        [id],
      )
    ).rows,
  };
}
export async function getCheckout(actor: Actor, id: string): Promise<Checkout> {
  await assertActiveActor(actor);
  if (
    !(
      await db.query("SELECT 1 FROM checkout WHERE id=$1 AND buyer_id=$2", [
        id,
        actor.userId,
      ])
    ).rowCount
  )
    throw new DomainError("NOT_FOUND", "Không tìm thấy đơn.");
  return readCheckout(db, id);
}
export async function createCheckout(
  actor: Actor,
  input: unknown,
  idempotencyKey: string,
): Promise<Checkout> {
  await assertActiveActor(actor);
  const parsed = z
    .object({
      address: addressSchema,
      quoteToken: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .safeParse(input);
  if (!parsed.success || !z.uuid().safeParse(idempotencyKey).success)
    throw new DomainError(
      "INVALID_INPUT",
      "Kiểm tra thông tin nhận hàng và xác nhận tổng tiền.",
    );
  const v = parsed.data,
    requestHash = hash(v);
  return withTransaction(async (client) => {
    await lockCart(client, actor);
    const existing = (
      await client.query(
        "SELECT id,request_hash FROM checkout WHERE buyer_id=$1 AND idempotency_key=$2",
        [actor.userId, idempotencyKey],
      )
    ).rows[0];
    if (existing) {
      if (existing.request_hash !== requestHash)
        throw new DomainError(
          "CONFLICT",
          "Yêu cầu đã được dùng cho thông tin khác.",
        );
      return readCheckout(client, existing.id);
    }
    await client.query(
      "SELECT s.id FROM shop s WHERE s.id IN (SELECT v.shop_id FROM cart_item c JOIN product_variant v ON v.id=c.variant_id WHERE c.user_id=$1) ORDER BY s.id FOR UPDATE",
      [actor.userId],
    );
    await client.query(
      "SELECT p.id FROM product p WHERE p.id IN (SELECT v.product_id FROM cart_item c JOIN product_variant v ON v.id=c.variant_id WHERE c.user_id=$1) ORDER BY p.id FOR UPDATE",
      [actor.userId],
    );
    await client.query(
      "SELECT v.id FROM product_variant v JOIN cart_item c ON c.variant_id=v.id WHERE c.user_id=$1 ORDER BY v.id FOR UPDATE OF v",
      [actor.userId],
    );
    const quote = await buildQuote(client, actor, v.address.region);
    if (quote.token !== v.quoteToken)
      throw new DomainError(
        "CONFLICT",
        "Giá, phí hoặc sản phẩm đã thay đổi. Vui lòng xem lại tổng tiền.",
      );
    const id = randomUUID();
    await client.query(
      "INSERT INTO checkout(id,buyer_id,idempotency_key,request_hash,total,address,policy_id) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [
        id,
        actor.userId,
        idempotencyKey,
        requestHash,
        quote.total,
        JSON.stringify(v.address),
        quote.policy.id,
      ],
    );
    for (const shop of quote.shops) {
      const orderId = randomUUID();
      const source = await checkoutSource(
        client,
        actor,
        quote.lines
          .filter((x) => x.shopId === shop.shopId)
          .map((x) => x.productId),
      );
      await client.query(
        "INSERT INTO shop_order(id,checkout_id,shop_id,subtotal,shipping,commission_bps,policy_snapshot,source_kind,source_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [
          orderId,
          id,
          shop.shopId,
          shop.subtotal,
          shop.shipping,
          quote.policy.commissionBps,
          JSON.stringify(quote.policy),
          source.kind,
          source.id,
        ],
      );
      for (const line of quote.lines.filter((x) => x.shopId === shop.shopId)) {
        await client.query(
          "INSERT INTO order_item(id,order_id,product_id,variant_id,name,label,attributes,quantity,unit_price) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
          [
            randomUUID(),
            orderId,
            line.productId,
            line.variantId,
            line.name,
            line.label,
            JSON.stringify(line.attributes),
            line.quantity,
            line.unitPrice,
          ],
        );
        await client.query(
          "UPDATE product_variant SET reserved=reserved+$2 WHERE id=$1",
          [line.variantId, line.quantity],
        );
        await client.query(
          "INSERT INTO inventory_reservation(checkout_id,variant_id,quantity) VALUES($1,$2,$3)",
          [id, line.variantId, line.quantity],
        );
      }
    }
    await client.query("DELETE FROM cart_item WHERE user_id=$1", [
      actor.userId,
    ]);
    return readCheckout(client, id);
  });
}
export async function releaseExpiredReservations(): Promise<number> {
  const candidates = (
    await db.query(
      "SELECT id FROM checkout WHERE status='awaiting_payment' AND expires_at<now() ORDER BY id LIMIT 100",
    )
  ).rows;
  let released = 0;
  for (const row of candidates)
    await withTransaction(async (client) => {
      const locked = await client.query(
        "SELECT id FROM checkout WHERE id=$1 AND status='awaiting_payment' AND expires_at<now() FOR UPDATE",
        [row.id],
      );
      if (!locked.rowCount) return;
      const reservations = (
        await client.query(
          "SELECT variant_id,quantity FROM inventory_reservation WHERE checkout_id=$1 AND status='held' ORDER BY variant_id",
          [row.id],
        )
      ).rows;
      for (const r of reservations)
        await client.query(
          "UPDATE product_variant SET reserved=reserved-$2 WHERE id=$1",
          [r.variant_id, r.quantity],
        );
      await client.query(
        "UPDATE inventory_reservation SET status='released' WHERE checkout_id=$1 AND status='held'",
        [row.id],
      );
      await client.query(
        "UPDATE checkout SET status='expired',cancel_reason='timeout' WHERE id=$1",
        [row.id],
      );
      await client.query(
        "UPDATE shop_order SET status='cancelled' WHERE checkout_id=$1 AND status='awaiting_payment'",
        [row.id],
      );
      released++;
    });
  return released;
}

export async function setCartItem(
  actor: Actor,
  id: string,
  quantity: number,
): Promise<void> {
  return changeCartItem(actor, id, quantity, "set");
}
export async function addCartItem(
  actor: Actor,
  id: string,
  quantity: number,
): Promise<void> {
  return changeCartItem(actor, id, quantity, "add");
}
