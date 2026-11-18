import { requireActor } from "@/modules/access/service";
import { apiError } from "@/server/http";
export async function GET(request: Request) {
  try {
    return Response.json(await requireActor(request.headers), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return apiError(e);
  }
}
