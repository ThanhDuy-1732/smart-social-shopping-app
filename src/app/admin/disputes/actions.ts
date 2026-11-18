"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireActor } from "@/modules/access/service";
import { approveRefund, rejectReturn } from "@/modules/returns/service";
import { DomainError } from "@/modules/shared/types";
import { actionError } from "@/server/action-error";
import type { ActionState } from "@/components/action-form";
export async function decideReturn(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(await headers());
    const id = String(data.get("caseId"));
    if (!["approve", "reject"].includes(String(data.get("decision"))))
      throw new DomainError("INVALID_INPUT", "Quyết định chưa hợp lệ.");
    if (data.get("decision") === "reject")
      await rejectReturn(actor, id, String(data.get("reason")));
    else {
      const amount = String(data.get("amount"));
      if (!/^[1-9]\d{0,17}$/.test(amount))
        throw new DomainError(
          "INVALID_INPUT",
          "Điền số tiền hoàn nguyên dương.",
        );
      await approveRefund(actor, id, BigInt(amount));
    }
    revalidatePath("/admin/disputes");
    revalidatePath(`/orders/${data.get("orderId")}`);
    return {
      success:
        "Đã lưu quyết định. Khoản được duyệt hoàn vẫn chờ kết quả xử lý thanh toán.",
    };
  } catch (error) {
    return actionError(error);
  }
}
