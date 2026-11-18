import { beforeAll, afterAll, test, expect } from "vitest";
import { db } from "@/server/db";
import { prepareDatabase } from "../fixtures/database";
import {
  commerceFixture,
  cleanupCommerce,
  type CommerceFixture,
} from "../fixtures/commerce";
import { createPost } from "@/modules/social/service";
import { discover, saveList, getList } from "@/modules/discovery/service";
let f: CommerceFixture;
beforeAll(async () => {
  await prepareDatabase();
  f = await commerceFixture();
});
afterAll(async () => {
  if (f) await cleanupCommerce(f);
  await db.end();
});
test("local suggestions explain travel, workspace and personal care without pretending to call AI", async () => {
  for (const [query, keyword] of [
    ["Tôi muốn đi Trung Quốc", "vali"],
    ["Tôi cần góc làm việc", "đèn bàn"],
    ["Tôi muốn chăm sóc da", "chống nắng"],
  ]) {
    const result = await discover(f.buyer, { query });
    expect(result.mode).toBe("local-keywords");
    expect(result.groups.flatMap((g) => g.keywords).join(" ")).toContain(
      keyword,
    );
  }
  const result = await discover(f.buyer, { query: "Tôi cần chuẩn bị" });
  expect(result.question).toBeTruthy();
  await expect(
    discover(f.buyer, { query: "a", budget: "-1" }),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
});
test("results use real visible records and budget, hidden items disappear on retrieval", async () => {
  const p = f.products[0];
  await db.query(
    "UPDATE product SET name='Vali du lịch',search_text='vali du lich' WHERE id=$1",
    [p.productId],
  );
  const postId = await createPost(f.other, {
    text: "Kinh nghiệm du lịch Trung Quốc",
    mediaIds: [],
    productIds: [],
    topics: ["du lịch"],
  });
  const r = await discover(f.buyer, {
    query: "Tôi muốn đi Trung Quốc",
    budget: "150000",
  });
  expect(
    r.groups.flatMap((g) => g.products).some((x) => x.id === p.productId),
  ).toBe(true);
  expect(r.groups.flatMap((g) => g.posts).some((x) => x.id === postId)).toBe(
    true,
  );
  expect(
    r.groups
      .flatMap((g) => g.products)
      .every((x) => BigInt(x.price) <= 150000n),
  ).toBe(true);
  await db.query("UPDATE product SET status='hidden' WHERE id=$1", [
    p.productId,
  ]);
  await db.query("UPDATE social_post SET status='hidden' WHERE id=$1", [
    postId,
  ]);
  const hidden = await discover(f.buyer, { query: "Tôi muốn đi Trung Quốc" });
  expect(JSON.stringify(hidden)).not.toContain(p.productId);
  expect(JSON.stringify(hidden)).not.toContain(postId);
});
test("lists are private, editable and revalidate product visibility", async () => {
  const p = f.products[0];
  await db.query("UPDATE product SET status='published' WHERE id=$1", [
    p.productId,
  ]);
  const id = await saveList(f.buyer, {
    title: "Hành lý",
    items: [
      {
        label: "Vali",
        keyword: "vali",
        productId: p.productId,
        checked: false,
      },
    ],
  });
  await expect(getList(f.other, id)).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  await expect(
    saveList(f.other, { id, title: "Ghi đè", items: [] }),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  await db.query("UPDATE product SET status='hidden' WHERE id=$1", [
    p.productId,
  ]);
  expect((await getList(f.buyer, id)).items[0].product).toBeNull();
  await saveList(f.buyer, {
    id,
    title: "Đã sửa",
    items: [{ label: "Hộ chiếu", checked: true }],
  });
  expect((await getList(f.buyer, id)).items[0].checked).toBe(true);
});
