"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireActor } from "@/modules/access/service";
import {
  prepareSettlement,
  approveSettlement,
  cancelSettlement,
  recordPayout,
} from "@/modules/finance/service";
import { DomainError } from "@/modules/shared/types";
import { actionError } from "@/server/action-error";
import type { ActionState } from "@/components/action-form";
export async function prepareBatch(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(await headers());
    const now = (
      await db.query("SELECT now() AS time")
    ).rows[0].time.toISOString();
    await prepareSettlement(actor, String(data.get("shopId")), now);
    revalidatePath("/admin/settlements");
    revalidatePath("/seller/finance");
    return { success: "Đã lập đợt và dành riêng khoản đủ điều kiện chi trả." };
  } catch (error) {
    return actionError(error);
  }
}
export async function decideBatch(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(await headers());
    const id = String(data.get("settlementId"));
    const decision = String(data.get("decision"));
    if (decision === "approve") await approveSettlement(actor, id);
    else if (decision === "cancel")
      await cancelSettlement(actor, id, String(data.get("reason")));
    else if (decision === "payout")
      await recordPayout(
        actor,
        id,
        String(data.get("evidenceId")),
        String(data.get("bankReference")),
      );
    else throw new DomainError("INVALID_INPUT", "Thao tác chưa hợp lệ.");
    revalidatePath("/admin/settlements");
    revalidatePath("/seller/finance");
    return {
      success:
        decision === "payout"
          ? "Đã ghi nhận chuyển khoản theo bằng chứng."
          : "Đã cập nhật đợt đối soát.",
    };
  } catch (error) {
    return actionError(error);
  }
}
