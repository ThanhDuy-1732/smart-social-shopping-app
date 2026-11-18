"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActor } from "@/modules/access/service";
import {
  interact,
  createPost,
  removePost,
  saveProfile,
} from "@/modules/social/service";
import { DomainError } from "@/modules/shared/types";
import { actionError } from "@/server/action-error";
import type { ActionState } from "@/components/action-form";
export async function socialAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(await headers());
    await interact(actor, {
      type: data.get("type"),
      targetId: data.get("targetId"),
      enabled: data.get("enabled") === "true",
      text: data.get("text"),
    });
    revalidatePath("/feed");
    revalidatePath(`/posts/${data.get("targetId")}`);
    revalidatePath(`/users/${data.get("targetId")}`);
    revalidatePath("/settings");
    return { success: "Đã cập nhật." };
  } catch (error) {
    return actionError(error);
  }
}
export async function publishPost(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  let id;
  try {
    const actor = await requireActor(await headers());
    let mediaIds, productIds;
    try {
      mediaIds = JSON.parse(String(data.get("mediaIds") ?? "[]"));
      productIds = JSON.parse(String(data.get("productIds") ?? "[]"));
    } catch {
      throw new DomainError(
        "INVALID_INPUT",
        "Các tệp hoặc sản phẩm chưa hợp lệ.",
      );
    }
    id = await createPost(actor, {
      text: data.get("text"),
      topics: String(data.get("topics") ?? "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      mediaIds,
      productIds,
    });
    revalidatePath("/feed");
  } catch (error) {
    return actionError(error);
  }
  redirect(`/posts/${id}`);
}
export async function deletePostAction(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    await removePost(
      await requireActor(await headers()),
      String(data.get("postId")),
    );
    revalidatePath("/feed");
  } catch (error) {
    return actionError(error);
  }
  redirect("/feed");
}
export async function updateProfile(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireActor(await headers());
    await saveProfile(actor, {
      name: data.get("name"),
      bio: data.get("bio"),
      avatarId: data.get("avatarId") || undefined,
    });
    revalidatePath("/settings");
    revalidatePath(`/users/${actor.userId}`);
    revalidatePath("/feed");
    return { success: "Đã lưu hồ sơ." };
  } catch (error) {
    return actionError(error);
  }
}
