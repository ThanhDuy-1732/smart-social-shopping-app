import { requireActor } from "@/modules/access/service";
import { readMedia } from "@/modules/media/service";
import { apiError, mediaResponse } from "@/server/http";
import { DomainError } from "@/modules/shared/types";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    let actor = null;
    try {
      actor = await requireActor(request.headers);
    } catch (error) {
      if (!(error instanceof DomainError) || error.code !== "UNAUTHENTICATED")
        throw error;
    }
    const file = await readMedia(actor, (await params).id);
    return mediaResponse(file.bytes, file.mime, request.headers.get("range"));
  } catch (error) {
    return apiError(error);
  }
}
