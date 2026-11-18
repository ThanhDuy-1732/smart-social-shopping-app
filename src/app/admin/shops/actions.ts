"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireActor } from "@/modules/access/service";
import { reviewShop } from "@/modules/shops/service";
import { actionError } from "@/server/action-error";
import type { ActionState } from "@/components/action-form";
export async function reviewApplication(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(await headers());
    await reviewShop(
      actor,
      String(data.get("shopId")),
      String(data.get("decision")),
      String(data.get("reason")),
    );
    revalidatePath("/admin/shops");
    revalidatePath("/seller");
    return { success: "Đã lưu kết quả xét duyệt." };
  } catch (error) {
    return actionError(error);
  }
}

export async function changeShopState(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const { changeShopSuspension } = await import("@/modules/shops/service");
    await changeShopSuspension(
      await requireActor(await headers()),
      String(data.get("shopId")),
      data.get("suspended") === "true",
      String(data.get("reason")),
    );
    revalidatePath("/admin/shops");
    revalidatePath("/search");
    revalidatePath("/seller");
    return { success: "Đã cập nhật trạng thái gian hàng." };
  } catch (error) {
    return actionError(error);
  }
}
