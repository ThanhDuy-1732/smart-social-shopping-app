import { beforeAll, afterAll, expect, test } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/server/db";
import { prepareDatabase } from "../fixtures/database";
import {
  commerceFixture,
  cleanupCommerce,
  type CommerceFixture,
} from "../fixtures/commerce";
import { setShippingRate } from "@/modules/shipping/service";
import {
  setCartItem,
  quoteCart,
  createCheckout,
  releaseExpiredReservations,
} from "@/modules/checkout/service";
let f: CommerceFixture;
const address = {
  name: "Người nhận thử",
  phone: "0901234567",
  region: "Hà Nội",
  line: "12 đường A, phường B, Hà Nội",
};
beforeAll(async () => {
  await prepareDatabase();
  f = await commerceFixture();
  for (const p of f.products)
    await setShippingRate(p.owner, p.shopId, {
      region: "Hà Nội",
      fee: "30000",
      estimatedDays: 3,
    });
});
afterAll(async () => {
  if (f) await cleanupCommerce(f);
  await db.end();
});
test("two shops create separate orders with authoritative prices and shipping", async () => {
  for (const p of f.products) await setCartItem(f.buyer, p.variantId, 1);
  const quote = await quoteCart(f.buyer, { region: "ha noi" });
  expect(quote.total).toBe("360000");
  expect(quote.shops).toHaveLength(2);
  const key = randomUUID();
  const order = await createCheckout(
    f.buyer,
    { address, quoteToken: quote.token },
    key,
  );
  expect(order.total).toBe("360000");
  expect(order.orders).toHaveLength(2);
  expect(
    (await createCheckout(f.buyer, { address, quoteToken: quote.token }, key))
      .id,
  ).toBe(order.id);
  await expect(
    createCheckout(
      f.buyer,
      {
        address: { ...address, line: "Một địa chỉ khác" },
        quoteToken: quote.token,
      },
      key,
    ),
  ).rejects.toMatchObject({ code: "CONFLICT" });
});
test("changed prices require a fresh confirmation and unsupported regions cannot order", async () => {
  const p = f.products[0];
  await setCartItem(f.buyer, p.variantId, 1);
  const quote = await quoteCart(f.buyer, { region: "Hà Nội" });
  await db.query("UPDATE product_variant SET price=110000 WHERE id=$1", [
    p.variantId,
  ]);
  await expect(
    createCheckout(f.buyer, { address, quoteToken: quote.token }, randomUUID()),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  await expect(quoteCart(f.buyer, { region: "Đà Nẵng" })).rejects.toMatchObject(
    { code: "CONFLICT" },
  );
  await db.query("UPDATE product_variant SET price=100000 WHERE id=$1", [
    p.variantId,
  ]);
});
test("concurrent buyers cannot reserve the same last item", async () => {
  const p = f.products[0];
  await db.query("UPDATE product_variant SET stock=reserved+1 WHERE id=$1", [
    p.variantId,
  ]);
  await setCartItem(f.buyer, p.variantId, 1);
  await setCartItem(f.other, p.variantId, 1);
  const a = await quoteCart(f.buyer, { region: "Hà Nội" }),
    b = await quoteCart(f.other, { region: "Hà Nội" });
  const result = await Promise.allSettled([
    createCheckout(f.buyer, { address, quoteToken: a.token }, randomUUID()),
    createCheckout(f.other, { address, quoteToken: b.token }, randomUUID()),
  ]);
  expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(
    (
      await db.query(
        "SELECT stock-reserved AS available FROM product_variant WHERE id=$1",
        [p.variantId],
      )
    ).rows[0].available,
  ).toBe(0);
});
test("expired reservations release once and do not modify stock sold", async () => {
  await db.query(
    "UPDATE checkout SET expires_at=now()-interval '1 minute' WHERE buyer_id=ANY($1::text[]) AND status='awaiting_payment'",
    [[f.buyer.userId, f.other.userId]],
  );
  expect(await releaseExpiredReservations()).toBeGreaterThanOrEqual(1);
  expect(await releaseExpiredReservations()).toBe(0);
  expect(
    (
      await db.query("SELECT reserved FROM product_variant WHERE id=$1", [
        f.products[0].variantId,
      ])
    ).rows[0].reserved,
  ).toBe(0);
});

test("checkout can complete with the connection pool otherwise occupied", async () => {
  const p = f.products[0];
  await setCartItem(f.buyer, p.variantId, 1);
  const quote = await quoteCart(f.buyer, { region: "Hà Nội" });
  const held = await Promise.all(Array.from({ length: 9 }, () => db.connect()));
  try {
    const order = await createCheckout(
      f.buyer,
      { address, quoteToken: quote.token },
      randomUUID(),
    );
    expect(order.status).toBe("awaiting_payment");
  } finally {
    for (const client of held) client.release();
  }
});

test("adding the same variant twice increases quantity instead of replacing it", async () => {
  const { addCartItem, getCart } = await import("@/modules/checkout/service");
  const id = f.products[0].variantId;
  await setCartItem(f.other, id, 0);
  await addCartItem(f.other, id, 1);
  await addCartItem(f.other, id, 1);
  expect(
    (await getCart(f.other)).find((x) => x.variantId === id)?.quantity,
  ).toBe(2);
});
