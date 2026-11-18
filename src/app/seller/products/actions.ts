"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireActor } from "@/modules/access/service";
import { saveProduct, listCategories } from "@/modules/catalog/service";
import { DomainError } from "@/modules/shared/types";
import { actionError } from "@/server/action-error";
import type { ActionState } from "@/components/action-form";
export async function submitProduct(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(await headers());
    const categories = await listCategories();
    const category = categories.find((x) => x.id === data.get("categoryId"));
    if (!category)
      throw new DomainError("INVALID_INPUT", "Chọn ngành hàng hợp lệ.");
    const attributes: Record<string, string | number> = {};
    for (const def of category.attributes) {
      const raw = String(data.get(`attribute:${def.key}`) ?? "").trim();
      if (raw !== "")
        attributes[def.key] = def.kind === "number" ? Number(raw) : raw;
    }
    let variants;
    try {
      variants = JSON.parse(String(data.get("variants")));
    } catch {
      throw new DomainError("INVALID_INPUT", "Danh sách biến thể chưa hợp lệ.");
    }
    await saveProduct(actor, {
      id: data.get("id") || undefined,
      shopId: data.get("shopId"),
      categoryId: category.id,
      name: data.get("name"),
      description: data.get("description"),
      attributes,
      variants,
      mediaIds: JSON.parse(String(data.get("mediaIds") ?? "[]")),
    });
    revalidatePath("/seller/products");
    revalidatePath("/admin/products");
    revalidatePath("/search");
    if (data.get("id")) revalidatePath(`/products/${data.get("id")}`);
    return {
      success:
        "Đã lưu và gửi sản phẩm xét duyệt. Sản phẩm chỉ xuất hiện khi được chấp thuận.",
    };
  } catch (error) {
    return actionError(error);
  }
}
