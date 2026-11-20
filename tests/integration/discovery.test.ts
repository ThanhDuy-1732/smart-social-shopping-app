import { beforeAll, afterAll, test, expect, vi } from "vitest";
import { db } from "@/server/db";
import { prepareDatabase } from "../fixtures/database";
import {
  commerceFixture,
  cleanupCommerce,
  type CommerceFixture,
} from "../fixtures/commerce";
import { createPost } from "@/modules/social/service";
import { discover, saveList, getList } from "@/modules/discovery/service";
import { aiResponse } from "../fixtures/ai";
import { randomUUID } from "node:crypto";
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

test("a sold-out cheap variant cannot make an expensive available variant fit the budget", async () => {
  const p = f.products[1];
  const { randomUUID } = await import("node:crypto");
  await db.query(
    "UPDATE product SET name='Vali thử ngân sách',search_text='vali thu ngan sach' WHERE id=$1",
    [p.productId],
  );
  await db.query(
    "INSERT INTO product_variant(id,product_id,shop_id,sku,label,price,stock) VALUES($1,$2,$3,$4,'Bản rẻ hết hàng',50000,0)",
    [randomUUID(), p.productId, p.shopId, randomUUID()],
  );
  const result = await discover(f.buyer, {
    query: "Tôi muốn đi Trung Quốc",
    budget: "100000",
  });
  expect(
    result.groups
      .flatMap((g) => g.products)
      .some((item) => item.id === p.productId),
  ).toBe(false);
});

test("AI suggestions replace templates when configured, with fallback on failure", async () => {
  vi.stubEnv("OPENCODE_API_KEY", "test-key");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      aiResponse({
        question: "Bạn đi mấy ngày?",
        needs: [
          {
            title: "Hành lý chuyến đi",
            reason: "Chọn theo thời gian và quy định hãng.",
            optional: false,
            keywords: ["vali xịn", "túi đựng đồ"],
          },
        ],
      }),
    ),
  );
  const ai = await discover(f.buyer, {
    query: "Chuyến đi Đà Lạt cuối tuần",
    budget: "150000",
  });
  expect(ai.mode).toBe("ai");
  expect(ai.question).toBe("Bạn đi mấy ngày?");
  expect(ai.groups).toHaveLength(1);
  expect(ai.groups[0].keywords).toContain("vali xịn");
  expect(
    ai.groups
      .flatMap((g) => g.products)
      .every((x) => BigInt(x.price) <= 150000n),
  ).toBe(true);
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("gateway down")));
  const fallback = await discover(f.buyer, {
    query: "Chuyến đi Đà Lạt cuối tuần",
  });
  expect(fallback.mode).toBe("local-keywords");
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

test("anonymous AI requests are rate limited per IP without touching signed-in quota", async () => {
  vi.stubEnv("OPENCODE_API_KEY", "test-key");
  const stub = vi
    .fn()
    .mockResolvedValue(
      aiResponse({
        question: null,
        needs: [
          {
            title: "Hành lý",
            reason: "Chọn theo thời gian đi.",
            optional: false,
            keywords: ["vali"],
          },
        ],
      }),
    );
  vi.stubGlobal("fetch", stub);
  const ip = randomUUID();
  for (let i = 0; i < 10; i++)
    await discover(null, { query: "Chuyến đi Đà Lạt cuối tuần" }, ip);
  await expect(
    discover(null, { query: "Chuyến đi Đà Lạt cuối tuần" }, ip),
  ).rejects.toMatchObject({ code: "RATE_LIMITED" });
  await expect(
    discover(null, { query: "Chuyến đi Đà Lạt cuối tuần" }, randomUUID()),
  ).resolves.toMatchObject({ mode: "ai" });
  expect(stub).toHaveBeenCalledTimes(11);
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

test("anonymous requests skip the AI spend gate when no key is configured", async () => {
  vi.stubEnv("OPENCODE_API_KEY", "");
  vi.stubGlobal("fetch", vi.fn());
  await expect(
    discover(null, { query: "Chuyến đi Đà Lạt cuối tuần" }, randomUUID()),
  ).resolves.toMatchObject({ mode: "local-keywords" });
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
