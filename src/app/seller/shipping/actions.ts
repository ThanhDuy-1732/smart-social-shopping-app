"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireActor } from "@/modules/access/service";
import { setShippingRate } from "@/modules/shipping/service";
import { actionError } from "@/server/action-error";
import type { ActionState } from "@/components/action-form";
export async function saveShipping(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(await headers());
    await setShippingRate(actor, String(data.get("shopId")), {
      region: data.get("nationwide") === "yes" ? "*" : data.get("region"),
      fee: data.get("fee"),
      estimatedDays: Number(data.get("estimatedDays")),
    });
    revalidatePath("/seller/shipping");
    return { success: "Đã lưu phí giao hàng." };
  } catch (error) {
    return actionError(error);
  }
}
