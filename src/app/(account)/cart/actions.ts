"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireActor } from "@/modules/access/service";
import { setCartItem, addCartItem } from "@/modules/checkout/service";
import { actionError } from "@/server/action-error";
import type { ActionState } from "@/components/action-form";
export async function updateCart(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(await headers());
    await setCartItem(
      actor,
      String(data.get("variantId")),
      Number(data.get("quantity")),
    );
    revalidatePath("/cart");
    return { success: "Đã cập nhật giỏ hàng." };
  } catch (error) {
    return actionError(error);
  }
}

export async function addToCart(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(await headers());
    await addCartItem(
      actor,
      String(data.get("variantId")),
      Number(data.get("quantity")),
    );
    revalidatePath("/cart");
    return { success: "Đã thêm vào giỏ hàng." };
  } catch (error) {
    return actionError(error);
  }
}
