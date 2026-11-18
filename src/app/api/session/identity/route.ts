import { requireActor, getAllowedPermissions } from "@/modules/access/service";
import { apiError } from "@/server/http";
export async function GET(request: Request) {
  try {
    const actor = await requireActor(request.headers);
    return Response.json(
      { ...actor, permissions: await getAllowedPermissions(actor) },
      {
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  } catch (e) {
    return apiError(e);
  }
}
