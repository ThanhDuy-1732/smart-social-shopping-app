import { randomUUID } from "node:crypto";
import { createAccount } from "./accounts";
import { applyForShop, reviewShop } from "@/modules/shops/service";
import {
  createCategory,
  saveProduct,
  publishProduct,
} from "@/modules/catalog/service";
import { publishPolicy } from "@/modules/policies/service";
import { db } from "@/server/db";
import type { Actor } from "@/modules/shared/types";
export async function commerceFixture() {
  const admin = await createAccount("admin"),
    buyer = await createAccount(),
    other = await createAccount();
  const owners = [await createAccount(), await createAccount()];
  const marker = randomUUID();
  const categoryId = await createCategory(admin, {
    name: `Fixture ${marker}`,
    attributes: [],
  });
  await publishPolicy(admin, {
    commissionBps: 300,
    returnDays: 7,
    sellerAcceptHours: 24,
    settlementHoldDays: 7,
    cancellationTerms: "Hủy trước khi nhà bán xác nhận.",
    returnTerms: "Hoàn khi sản phẩm sai mô tả.",
    receiptTerms: "Khách xác nhận hoặc hỗ trợ xác minh.",
    shippingTerms: "Phí theo tỉnh thành đã công bố.",
  });
  const products = [];
  for (const [index, owner] of owners.entries()) {
    const shopId = await applyForShop(owner, {
      name: `Shop ${index} ${marker.slice(0, 8)}`,
      description: "Dữ liệu thử giao dịch nhiều shop.",
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
      "Đã xác minh dữ liệu thử nghiệm",
    );
    const productId = await saveProduct(owner, {
      shopId,
      categoryId,
      name: `Sản phẩm ${index}`,
      description: "Sản phẩm thử giao dịch có tồn kho.",
      attributes: {},
      variants: [
        {
          sku: randomUUID(),
          label: "Bản tiêu chuẩn",
          price: index === 0 ? "100000" : "200000",
          stock: 5,
        },
      ],
    });
    await publishProduct(admin, productId);
    const variantId = (
      await db.query("SELECT id FROM product_variant WHERE product_id=$1", [
        productId,
      ])
    ).rows[0].id as string;
    products.push({ shopId, productId, variantId, owner });
  }
  return { admin, buyer, other, owners, categoryId, products };
}
export type CommerceFixture = Awaited<ReturnType<typeof commerceFixture>>;
export async function cleanupCommerce(f: CommerceFixture) {
  const actors: Actor[] = [f.admin, f.buyer, f.other, ...f.owners];
  await db.query("DELETE FROM checkout WHERE buyer_id=ANY($1::text[])", [
    actors.map((a) => a.userId),
  ]);
  for (const actor of actors)
    await db.query('DELETE FROM "user" WHERE id=$1', [actor.userId]);
  await db.query("DELETE FROM category WHERE id=$1", [f.categoryId]);
}
