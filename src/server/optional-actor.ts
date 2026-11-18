import { headers } from "next/headers";
import { requireActor } from "@/modules/access/service";
import { DomainError } from "@/modules/shared/types";
export async function optionalActor() {
  try {
    return await requireActor(await headers());
  } catch (error) {
    if (
      error instanceof DomainError &&
      ["UNAUTHENTICATED", "FORBIDDEN"].includes(error.code)
    )
      return null;
    throw error;
  }
}
