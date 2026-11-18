"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireActor } from "@/modules/access/service";
import { createCategory } from "@/modules/catalog/service";
import { DomainError } from "@/modules/shared/types";
import { actionError } from "@/server/action-error";
import type { ActionState } from "@/components/action-form";
export async function submitCategory(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(await headers());
    let attributes;
    try {
      attributes = JSON.parse(String(data.get("attributes")));
    } catch {
      throw new DomainError(
        "INVALID_INPUT",
        "Danh sách thuộc tính chưa hợp lệ.",
      );
    }
    await createCategory(actor, {
      name: data.get("name"),
      parentId: data.get("parentId") || undefined,
      attributes,
    });
    revalidatePath("/admin/categories");
    revalidatePath("/seller/products/new");
    return { success: "Đã tạo danh mục." };
  } catch (error) {
    return actionError(error);
  }
}
