"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireActor } from "@/modules/access/service";
import { reportContent, moderate } from "@/modules/moderation/service";
import { actionError } from "@/server/action-error";
import type { ActionState } from "@/components/action-form";
export async function sendReport(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    await reportContent(await requireActor(await headers()), {
      kind: data.get("kind"),
      targetId: data.get("targetId"),
      reason: data.get("reason"),
    });
    return { success: "Đã gửi báo cáo để bộ phận kiểm duyệt xem xét." };
  } catch (error) {
    return actionError(error);
  }
}
export async function resolveReport(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    await moderate(
      await requireActor(await headers()),
      String(data.get("reportId")),
      { action: data.get("action"), reason: data.get("reason") },
    );
    for (const path of [
      "/admin/moderation",
      "/feed",
      "/search",
      "/posts/[id]",
      "/products/[id]",
      "/users/[id]",
      "/shops/[id]",
    ])
      revalidatePath(path, path.includes("[id]") ? "page" : undefined);
    return { success: "Đã lưu quyết định kiểm duyệt." };
  } catch (error) {
    return actionError(error);
  }
}
