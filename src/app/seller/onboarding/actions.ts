"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireActor } from "@/modules/access/service";
import { applyForShop } from "@/modules/shops/service";
import { actionError } from "@/server/action-error";
import type { ActionState } from "@/components/action-form";
export async function submitShop(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(await headers());
    await applyForShop(actor, Object.fromEntries(data));
    revalidatePath("/seller");
    revalidatePath("/seller/onboarding");
    revalidatePath("/admin/shops");
    return {
      success:
        "Đã gửi hồ sơ. Bạn có thể theo dõi kết quả xét duyệt tại gian hàng của mình.",
    };
  } catch (error) {
    return actionError(error);
  }
}
