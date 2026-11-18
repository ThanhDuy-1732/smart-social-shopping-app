import { getReadyMedia } from "@/modules/media/service";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db, withTransaction } from "@/server/db";
import { requirePermission } from "@/modules/access/service";
import { requireApprovedShop } from "@/modules/shops/service";
import { DomainError, type Actor } from "@/modules/shared/types";
import {
  attributeDefinitions,
  productSchema,
  validateAttributes,
  normalizeSearch,
  type AttributeDefinition,
} from "./schema";
export async function createCategory(
  actor: Actor,
  input: unknown,
): Promise<string> {
  await requirePermission(actor, "catalog.manage");
  const result = z
    .object({
      name: z.string().trim().min(2).max(100),
      parentId: z.uuid().optional(),
      attributes: attributeDefinitions,
    })
    .safeParse(input);
  if (!result.success)
    throw new DomainError(
      "INVALID_INPUT",
      "Kiểm tra tên danh mục và định nghĩa thuộc tính.",
    );
  const id = randomUUID(),
    v = result.data;
  await withTransaction(async (client) => {
    if (
      v.parentId &&
      !(await client.query("SELECT 1 FROM category WHERE id=$1", [v.parentId]))
        .rowCount
    )
      throw new DomainError("INVALID_INPUT", "Danh mục cha không tồn tại.");
    await client.query(
      "INSERT INTO category(id,name,parent_id,attributes) VALUES($1,$2,$3,$4)",
      [id, v.name, v.parentId ?? null, JSON.stringify(v.attributes)],
    );
    await client.query(
      "INSERT INTO audit_event(id,actor_id,action,target_id) VALUES($1,$2,'category.create',$3)",
      [randomUUID(), actor.userId, id],
    );
  });
  return id;
}
export async function saveProduct(
  actor: Actor,
  input: unknown,
): Promise<string> {
  const result = productSchema.safeParse(input);
  if (!result.success)
    throw new DomainError(
      "INVALID_INPUT",
      "Kiểm tra tên, ngành hàng, biến thể, giá nguyên dương và tồn kho.",
    );
  const v = result.data;
  await requireApprovedShop(actor, v.shopId);
  await getReadyMedia(actor, v.mediaIds);
  try {
    return await withTransaction(async (client) => {
      const category = (
        await client.query<{ attributes: AttributeDefinition[] }>(
          "SELECT attributes FROM category WHERE id=$1",
          [v.categoryId],
        )
      ).rows[0];
      if (!category)
        throw new DomainError("INVALID_INPUT", "Danh mục không tồn tại.");
      validateAttributes(category.attributes, v.attributes);
      const id = v.id ?? randomUUID();
      if (v.id) {
        const existing = await client.query(
          "SELECT shop_id FROM product WHERE id=$1 FOR UPDATE",
          [id],
        );
        if (existing.rows[0]?.shop_id !== v.shopId)
          throw new DomainError(
            "FORBIDDEN",
            "Không được sửa sản phẩm của gian hàng khác.",
          );
      }
      const search = normalizeSearch(
        [v.name, v.description, ...Object.values(v.attributes)].join(" "),
      );
      await client.query(
        "INSERT INTO product(id,shop_id,category_id,name,description,attributes,search_text) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO UPDATE SET category_id=$3,name=$4,description=$5,attributes=$6,search_text=$7,status='pending',updated_at=now()",
        [
          id,
          v.shopId,
          v.categoryId,
          v.name,
          v.description,
          JSON.stringify(v.attributes),
          search,
        ],
      );
      const existingVariants = (
        await client.query<{ id: string; reserved: number; stock: number }>(
          "SELECT id,reserved,stock FROM product_variant WHERE product_id=$1 ORDER BY id FOR UPDATE",
          [id],
        )
      ).rows;
      if (
        existingVariants.some(
          (e) => e.reserved > 0 && !v.variants.some((x) => x.id === e.id),
        )
      )
        throw new DomainError(
          "CONFLICT",
          "Biến thể đang có đơn giữ hàng, chưa thể ngừng bán.",
        );
      await client.query(
        "UPDATE product_variant SET active=false WHERE product_id=$1",
        [id],
      );
      for (const variant of v.variants) {
        if (variant.id && !existingVariants.some((x) => x.id === variant.id))
          throw new DomainError("FORBIDDEN", "Biến thể không thuộc sản phẩm.");
        const old = existingVariants.find((x) => x.id === variant.id);
        let stock = variant.stock;
        if (old) {
          if (variant.originalStock === undefined)
            throw new DomainError(
              "INVALID_INPUT",
              "Tải lại trang sản phẩm để xác nhận tồn kho gốc.",
            );
          if (variant.stock === variant.originalStock) stock = old.stock;
          else if (old.stock !== variant.originalStock)
            throw new DomainError(
              "CONFLICT",
              "Tồn kho đã thay đổi. Tải lại trang trước khi điều chỉnh số lượng.",
            );
        }
        if (old && stock < old.reserved)
          throw new DomainError(
            "CONFLICT",
            "Tồn kho không được nhỏ hơn số lượng đang giữ.",
          );
        await client.query(
          "INSERT INTO product_variant(id,product_id,shop_id,sku,label,price,stock) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO UPDATE SET sku=$4,label=$5,price=$6,stock=$7,active=true",
          [
            variant.id ?? randomUUID(),
            id,
            v.shopId,
            variant.sku,
            variant.label,
            variant.price,
            stock,
          ],
        );
      }
      await client.query("DELETE FROM product_media WHERE product_id=$1", [id]);
      for (const [position, mediaId] of v.mediaIds.entries())
        await client.query(
          "INSERT INTO product_media(product_id,media_id,position) VALUES($1,$2,$3)",
          [id, mediaId, position],
        );
      return id;
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    )
      throw new DomainError("CONFLICT", "Mã SKU đã được dùng trong gian hàng.");
    throw error;
  }
}
export async function publishProduct(actor: Actor, id: string): Promise<void> {
  await requirePermission(actor, "content.moderate");
  await withTransaction(async (client) => {
    const p = (
      await client.query(
        "SELECT p.id,s.status FROM product p JOIN shop s ON s.id=p.shop_id WHERE p.id=$1 FOR UPDATE OF p,s",
        [id],
      )
    ).rows[0];
    if (!p) throw new DomainError("NOT_FOUND", "Không tìm thấy sản phẩm.");
    if (p.status !== "approved")
      throw new DomainError("CONFLICT", "Gian hàng chưa được phép mở bán.");
    await client.query(
      "UPDATE product SET status='published',updated_at=now() WHERE id=$1",
      [id],
    );
    await client.query(
      "INSERT INTO audit_event(id,actor_id,action,target_id) VALUES($1,$2,'product.publish',$3)",
      [randomUUID(), actor.userId, id],
    );
  });
}
export async function setProductVisibility(
  actor: Actor,
  id: string,
  visible: boolean,
): Promise<void> {
  if (visible) return publishProduct(actor, id);
  await requirePermission(actor, "content.moderate");
  await withTransaction(async (client) => {
    const result = await client.query(
      "UPDATE product SET status='hidden',updated_at=now() WHERE id=$1 RETURNING id",
      [id],
    );
    if (!result.rowCount)
      throw new DomainError("NOT_FOUND", "Không tìm thấy sản phẩm.");
    await client.query(
      "INSERT INTO audit_event(id,actor_id,action,target_id) VALUES($1,$2,'product.hide',$3)",
      [randomUUID(), actor.userId, id],
    );
  });
}
export async function listCategories() {
  return (
    await db.query<{
      id: string;
      name: string;
      parentId: string | null;
      attributes: AttributeDefinition[];
    }>(
      'SELECT id,name,parent_id AS "parentId",attributes FROM category ORDER BY name,id',
    )
  ).rows;
}
