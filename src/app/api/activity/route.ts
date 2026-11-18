import { requireActor } from "@/modules/access/service";
import { trackActivity } from "@/modules/reporting/service";
import { apiError, requireOrigin, readLimitedBody } from "@/server/http";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    await trackActivity(
      await requireActor(request.headers),
      JSON.parse(
        new TextDecoder().decode(await readLimitedBody(request, 4096)),
      ),
    );
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
