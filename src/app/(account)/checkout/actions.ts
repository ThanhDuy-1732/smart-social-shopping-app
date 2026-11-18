"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireActor } from "@/modules/access/service";
import { createCheckout } from "@/modules/checkout/service";
import { DomainError } from "@/modules/shared/types";
import { revalidatePath } from "next/cache";
import { actionError } from "@/server/action-error";
import type { ActionState } from "@/components/action-form";
export async function placeOrder(
  _state: ActionState,
  data: FormData,
): Promise<ActionState> {
  let id: string;
  try {
    const actor = await requireActor(await headers());
    const checkout = await createCheckout(
      actor,
      {
        address: {
          name: data.get("name"),
          phone: data.get("phone"),
          region: data.get("region"),
          line: data.get("line"),
        },
        quoteToken: data.get("quoteToken"),
      },
      String(data.get("requestKey")),
    );
    id = checkout.id;
  } catch (error) {
    if (error instanceof DomainError && error.code === "CONFLICT")
      revalidatePath("/checkout");
    return actionError(error);
  }
  redirect(`/checkout/${id}`);
}
