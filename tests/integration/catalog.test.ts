import { beforeAll, afterAll, expect, test } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/server/db";
import { prepareDatabase } from "../fixtures/database";
import { createAccount } from "../fixtures/accounts";
import { applyForShop, reviewShop } from "@/modules/shops/service";
import {
  createCategory,
  saveProduct,
  publishProduct,
  setProductVisibility,
} from "@/modules/catalog/service";
import { searchCatalog } from "@/modules/catalog/queries";
import type { Actor } from "@/modules/shared/types";
let admin: Actor,
  owner: Actor,
  other: Actor,
  shopId: string,
  categoryId: string,
  productId: string;
const marker = randomUUID().slice(0, 8);
const product = () => ({
  shopId,
  categoryId,
  name: `Áo khoác ${marker}`,
  description: "Áo khoác đi đường có hai lớp.",
  attributes: { material: "cotton" },
  variants: [
    {
      sku: `AO-${marker}`,
      label: "Màu xanh, size M",
      price: "250000",
      stock: 2,
    },
  ],
});
beforeAll(async () => {
  await prepareDatabase();
  admin = await createAccount("admin");
  owner = await createAccount();
  other = await createAccount();
  shopId = await applyForShop(owner, {
    name: "Shop thử catalog",
    description: "Dữ liệu thử catalog nhiều ngành",
    phone: "0901234567",
    address: "12 đường A, Hà Nội",
    legalName: "Nguyễn Văn A",
    bankName: "Ngân hàng thử",
    bankAccount: "0123456789",
    bankHolder: "NGUYEN VAN A",
  });
  await reviewShop(
    admin,
    shopId,
    "approve",
    "Đã xác minh thông tin thử nghiệm",
  );
});
afterAll(async () => {
  if (categoryId) {
    await db.query("DELETE FROM product WHERE category_id=$1", [categoryId]);
    await db.query("DELETE FROM category WHERE id=$1", [categoryId]);
  }
  for (const a of [admin, owner, other])
    if (a) await db.query('DELETE FROM "user" WHERE id=$1', [a.userId]);
  await db.end();
});
test("category definitions support different required attributes per industry", async () => {
  categoryId = await createCategory(admin, {
    name: `Thời trang ${marker}`,
    attributes: [
      {
        key: "material",
        label: "Chất liệu",
        kind: "select",
        required: true,
        options: ["cotton", "linen"],
      },
    ],
  });
  await expect(
    saveProduct(owner, { ...product(), attributes: {} }),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  await expect(
    saveProduct(owner, { ...product(), attributes: { material: "wood" } }),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  for (const spec of [
    {
      name: "Điện tử",
      key: "power",
      label: "Công suất",
      kind: "number",
      value: 20,
    },
    {
      name: "Mỹ phẩm",
      key: "volume",
      label: "Dung tích",
      kind: "number",
      value: 100,
    },
  ] as const) {
    const id = await createCategory(admin, {
      name: `${spec.name} ${marker}`,
      attributes: [
        { key: spec.key, label: spec.label, kind: spec.kind, required: true },
      ],
    });
    try {
      const p = await saveProduct(owner, {
        ...product(),
        categoryId: id,
        name: `${spec.name} ${marker}`,
        attributes: { [spec.key]: spec.value },
        variants: [
          {
            sku: randomUUID(),
            label: "Bản tiêu chuẩn",
            price: "100000",
            stock: 1,
          },
        ],
      });
      expect(p).toBeTruthy();
    } finally {
      await db.query("DELETE FROM product WHERE category_id=$1", [id]);
      await db.query("DELETE FROM category WHERE id=$1", [id]);
    }
  }
});
test("only shop owner can submit, and only moderator can publish", async () => {
  await expect(saveProduct(other, product())).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
  productId = await saveProduct(owner, product());
  expect((await searchCatalog({ query: marker })).items).toEqual([]);
  await expect(publishProduct(owner, productId)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
  await publishProduct(admin, productId);
  expect(
    (await searchCatalog({ query: `ao khoac ${marker}` })).items[0].id,
  ).toBe(productId);
});
test("negative price, duplicate SKU and malformed attributes do not write", async () => {
  await expect(
    saveProduct(owner, {
      ...product(),
      variants: [{ sku: "BAD", label: "X", price: "-1", stock: 1 }],
    }),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  await expect(
    saveProduct(owner, {
      ...product(),
      variants: [...product().variants, ...product().variants],
    }),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  await expect(
    saveProduct(owner, {
      ...product(),
      attributes: { material: "cotton", unexpected: "value" },
    }),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
});
test("hidden products and suspended shops disappear; pagination stays stable", async () => {
  const second = await saveProduct(owner, {
    ...product(),
    name: `Áo thứ hai ${marker}`,
    variants: [{ ...product().variants[0], sku: `SECOND-${marker}` }],
  });
  await publishProduct(admin, second);
  const firstPage = await searchCatalog({ query: marker, limit: 1 });
  expect(firstPage.items).toHaveLength(1);
  expect(firstPage.nextCursor).toBeTruthy();
  const next = await searchCatalog({
    query: marker,
    limit: 1,
    cursor: firstPage.nextCursor!,
  });
  expect(next.items).toHaveLength(1);
  expect(next.items[0].id).not.toBe(firstPage.items[0].id);
  await setProductVisibility(admin, productId, false);
  expect(
    (await searchCatalog({ query: marker })).items.map((x) => x.id),
  ).not.toContain(productId);
  await db.query("UPDATE shop SET status='suspended' WHERE id=$1", [shopId]);
  expect((await searchCatalog({ query: marker })).items).toEqual([]);
  await db.query("UPDATE shop SET status='approved' WHERE id=$1", [shopId]);
  await db.query("DELETE FROM product WHERE id=$1", [second]);
});
