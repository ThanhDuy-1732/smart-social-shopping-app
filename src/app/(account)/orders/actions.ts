"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireActor } from "@/modules/access/service";
import { transitionOrder } from "@/modules/orders/service";
import { requestReturn } from "@/modules/returns/service";
import { submitReview } from "@/modules/reviews/service";
import { actionError } from "@/server/action-error";
import { DomainError } from "@/modules/shared/types";
import type { ActionState } from "@/components/action-form";
export async function changeOrder(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(await headers());
    const id = String(data.get("orderId"));
    await transitionOrder(actor, id, {
      type: data.get("type"),
      carrier: data.get("carrier"),
      trackingCode: data.get("trackingCode"),
      reason: data.get("reason"),
      evidenceId: data.get("evidenceId"),
    });
    revalidatePath(`/orders/${id}`);
    revalidatePath("/orders");
    revalidatePath("/seller/orders");
    return { success: "Đã cập nhật đơn hàng." };
  } catch (error) {
    return actionError(error);
  }
}
export async function sendReturn(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(await headers());
    const orderId = String(data.get("orderId"));
    const items = [...data.entries()]
      .filter(([key]) => key.startsWith("qty:"))
      .map(([key, value]) => ({
        itemId: key.slice(4),
        quantity: Number(value),
      }))
      .filter((x) => x.quantity > 0);
    let evidenceIds;
    try {
      evidenceIds = JSON.parse(String(data.get("evidenceIds") ?? "[]"));
    } catch {
      throw new DomainError(
        "INVALID_INPUT",
        "Danh sách bằng chứng chưa hợp lệ.",
      );
    }
    await requestReturn(actor, {
      orderId,
      items,
      reason: data.get("reason"),
      evidenceIds,
    });
    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/admin/disputes");
    return {
      success:
        "Đã gửi yêu cầu. Khoản hoàn chỉ được xác nhận sau khi có kết quả hoàn tiền.",
    };
  } catch (error) {
    return actionError(error);
  }
}
export async function sendReview(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(await headers());
    await submitReview(actor, String(data.get("itemId")), {
      rating: Number(data.get("rating")),
      text: data.get("text"),
    });
    revalidatePath(`/products/${data.get("productId")}`);
    return { success: "Đã đăng đánh giá từ giao dịch của bạn." };
  } catch (error) {
    return actionError(error);
  }
}
