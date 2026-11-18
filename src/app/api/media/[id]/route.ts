import { requireActor } from "@/modules/access/service";
import { completeUpload } from "@/modules/media/service";
import { requireOrigin, readLimitedBody, apiError } from "@/server/http";
import { db } from "@/server/db";
import { DomainError } from "@/modules/shared/types";
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    requireOrigin(request);
    const actor = await requireActor(request.headers);
    const { id } = await params;
    const row = (
      await db.query(
        "SELECT max_bytes FROM media WHERE id=$1 AND owner_id=$2",
        [id, actor.userId],
      )
    ).rows[0];
    if (!row)
      throw new DomainError("NOT_FOUND", "Không tìm thấy yêu cầu tải lên.");
    await completeUpload(
      actor,
      id,
      await readLimitedBody(request, row.max_bytes),
    );
    return Response.json(
      { status: "processing" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor(request.headers);
    const row = (
      await db.query(
        "SELECT id,kind,status FROM media WHERE id=$1 AND owner_id=$2",
        [(await params).id, actor.userId],
      )
    ).rows[0];
    if (!row) throw new DomainError("NOT_FOUND", "Không tìm thấy tệp.");
    return Response.json(row, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
