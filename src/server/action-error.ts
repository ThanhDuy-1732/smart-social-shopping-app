import { DomainError } from "@/modules/shared/types";
import type { ActionState } from "@/components/action-form";
export function actionError(error: unknown): ActionState {
  if (error instanceof DomainError) return { error: error.message };
  console.error("Server action failed", {
    name: error instanceof Error ? error.name : "UnknownError",
  });
  return { error: "Chưa thực hiện được thao tác. Vui lòng thử lại." };
}
