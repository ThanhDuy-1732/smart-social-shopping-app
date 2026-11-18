"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireActor } from "@/modules/access/service";
import { setUserRole, suspendUser } from "@/modules/users/service";
export async function changeRole(data: FormData) {
  const actor = await requireActor(await headers());
  await setUserRole(
    actor,
    String(data.get("userId")),
    String(data.get("role")),
    data.get("enabled") === "true",
  );
  revalidatePath("/admin/users");
}
export async function changeSuspension(data: FormData) {
  const actor = await requireActor(await headers());
  await suspendUser(
    actor,
    String(data.get("userId")),
    data.get("suspended") === "true",
  );
  revalidatePath("/admin/users");
}
