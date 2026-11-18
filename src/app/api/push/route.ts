import { auth } from "@/server/auth";
import { requireActor } from "@/modules/access/service";
import { subscribePush, unsubscribePush } from "@/modules/notifications/push";
import { apiError, requireOrigin, readLimitedBody } from "@/server/http";
import { DomainError } from "@/modules/shared/types";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const actor = await requireActor(request.headers),
      session = await auth.api.getSession({ headers: request.headers });
    if (!session)
      throw new DomainError("UNAUTHENTICATED", "Vui lòng đăng nhập.");
    await subscribePush(
      actor,
      JSON.parse(
        new TextDecoder().decode(await readLimitedBody(request, 8192)),
      ),
      session.session.id,
    );
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(request: Request) {
  try {
    requireOrigin(request);
    const actor = await requireActor(request.headers),
      body = JSON.parse(
        new TextDecoder().decode(await readLimitedBody(request, 4096)),
      );
    if (typeof body.endpoint !== "string")
      throw new DomainError("INVALID_INPUT", "Địa chỉ đăng ký chưa hợp lệ.");
    await unsubscribePush(actor, body.endpoint);
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
