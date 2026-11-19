import {
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  test,
  expect,
} from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/server/db";
import { prepareDatabase } from "../fixtures/database";
import {
  commerceFixture,
  cleanupCommerce,
  paidOrder,
  type CommerceFixture,
} from "../fixtures/commerce";
import { searchCatalog, getPublicProduct } from "@/modules/catalog/queries";
import { createPost } from "@/modules/social/service";
import { listFeed } from "@/modules/social/queries";
import { transitionOrder, getOrder } from "@/modules/orders/service";
import { requestReturn } from "@/modules/returns/service";
import { getShopReport } from "@/modules/reporting/service";
let f: CommerceFixture;
beforeAll(prepareDatabase);
beforeEach(async () => {
  f = await commerceFixture();
});
afterEach(async () => {
  if (f) await cleanupCommerce(f);
});
afterAll(() => db.end());
test("category attributes and availability filter actual variants, and approved shops can be found by name", async () => {
  const p = f.products[0];
  await db.query("UPDATE category SET attributes=$2 WHERE id=$1", [
    f.categoryId,
    JSON.stringify([
      {
        key: "brand",
        label: "Thương hiệu",
        kind: "select",
        required: false,
        options: ["ABC", "XYZ"],
      },
    ]),
  ]);
  await db.query("UPDATE product SET attributes=$2 WHERE id=$1", [
    p.productId,
    JSON.stringify({ brand: "ABC" }),
  ]);
  const matches = await searchCatalog({
    categoryId: f.categoryId,
    attributes: { brand: "ABC" },
  });
  expect(matches.items.map((x) => x.id)).toEqual([p.productId]);
  await db.query("UPDATE product_variant SET stock=0 WHERE id=$1", [
    p.variantId,
  ]);
  expect(
    (await searchCatalog({ shopId: p.shopId, inStock: true })).items,
  ).toHaveLength(0);
  await expect(
    searchCatalog({
      categoryId: f.categoryId,
      attributes: { brand: "invalid" },
    }),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  await db.query("UPDATE shop SET name='Mình dùng thử tìm shop' WHERE id=$1", [
    p.shopId,
  ]);
  const { searchShops } = await import("@/modules/catalog/queries");
  expect((await searchShops("minh dung thu")).map((s) => s.id)).toContain(
    p.shopId,
  );
});
test("product detail has public delivery estimates and only related visible posts", async () => {
  const p = f.products[0];
  await db.query(
    "INSERT INTO shipping_rate(shop_id,region,fee,estimated_days) VALUES($1,'*',30000,3)",
    [p.shopId],
  );
  const related = await createPost(f.other, {
    text: "Trải nghiệm sản phẩm liên quan thực tế",
    mediaIds: [],
    productIds: [p.productId],
    topics: [],
  });
  await createPost(f.other, {
    text: "Bài không gắn sản phẩm đang xem",
    mediaIds: [],
    productIds: [],
    topics: [],
  });
  expect(
    (await listFeed(f.buyer, { productId: p.productId })).items.map(
      (p) => p.id,
    ),
  ).toEqual([related]);
  expect((await getPublicProduct(p.productId))?.shippingRates).toEqual([
    { region: "*", fee: "30000", estimatedDays: 3 },
  ]);
  expect(
    (await listFeed(f.buyer, { productId: p.productId })).items[0].products[0],
  ).toMatchObject({
    available: true,
    price: "100000",
    coverId: null,
  });
  await db.query("UPDATE product SET status='hidden' WHERE id=$1", [
    p.productId,
  ]);
  expect(
    (await listFeed(f.buyer, { productId: p.productId })).items[0].products[0],
  ).toMatchObject({
    available: false,
    price: null,
    coverId: null,
  });
  await db.query("UPDATE social_post SET status='hidden' WHERE id=$1", [
    related,
  ]);
  expect(
    (await listFeed(f.buyer, { productId: p.productId })).items,
  ).toHaveLength(0);
});
test("only that shop can reply to its open return case and all parties can read the reply", async () => {
  const order = await paidOrder(f);
  await transitionOrder(order.owner, order.orderId, { type: "accept" });
  await transitionOrder(order.owner, order.orderId, {
    type: "ship",
    carrier: "Hãng thử",
    trackingCode: randomUUID(),
  });
  await transitionOrder(f.buyer, order.orderId, { type: "receive" });
  const detail = await getOrder(f.buyer, order.orderId),
    caseId = await requestReturn(f.buyer, {
      orderId: order.orderId,
      items: [{ itemId: detail.items[0].id, quantity: 1 }],
      reason: "Đề nghị nhà bán phản hồi về hàng lỗi",
    });
  const { replyToReturn } = await import("@/modules/returns/service");
  await expect(
    replyToReturn(f.other, caseId, "Đây không phải shop của tôi"),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  await replyToReturn(
    order.owner,
    caseId,
    "Shop đã nhận thông tin và sẽ phối hợp kiểm tra.",
  );
  expect(
    (await getOrder(f.buyer, order.orderId)).cases[0].sellerReply,
  ).toContain("phối hợp");
});
test("reports define cancellation and verified-refund rates without zero-division", async () => {
  const p = f.products[0],
    today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
  expect(
    (await getShopReport(p.owner, p.shopId, { from: today, to: today }))
      .cancellationRate,
  ).toBe(0);
  const order = await paidOrder(f);
  await transitionOrder(f.buyer, order.orderId, {
    type: "cancel",
    reason: "Khách hủy đơn trước khi giao hàng",
  });
  const report = await getShopReport(p.owner, p.shopId, {
    from: today,
    to: today,
  });
  expect(report.cancellationRate).toBe(100);
  expect(report.refundRate).toBe(0);
});
