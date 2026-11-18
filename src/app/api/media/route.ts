import { requireActor } from "@/modules/access/service";
import { requestUpload } from "@/modules/media/service";
import { requireOrigin, readLimitedBody, apiError } from "@/server/http";
import { DomainError } from "@/modules/shared/types";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const actor = await requireActor(request.headers);
    let input;
    try {
      input = JSON.parse(
        new TextDecoder().decode(await readLimitedBody(request, 4096)),
      );
    } catch (error) {
      if (error instanceof DomainError) throw error;
      throw new DomainError("INVALID_INPUT", "Thông tin tải lên chưa hợp lệ.");
    }
    return Response.json(await requestUpload(actor, input), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
