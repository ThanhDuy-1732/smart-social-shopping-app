import { z } from "zod";
import { requireActor } from "@/modules/access/service";
import {
  getConversation,
  listMessages,
  sendMessage,
  markRead,
} from "@/modules/chat/service";
import { apiError, requireOrigin, readLimitedBody } from "@/server/http";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) {
  try {
    const actor = await requireActor(request.headers),
      { id } = await params;
    return Response.json(
      {
        room: await getConversation(actor, id),
        ...(await listMessages(
          actor,
          id,
          new URL(request.url).searchParams.get("before") ?? undefined,
        )),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request, { params }: Context) {
  try {
    requireOrigin(request);
    const actor = await requireActor(request.headers),
      { id } = await params;
    const body = JSON.parse(
      new TextDecoder().decode(await readLimitedBody(request, 16384)),
    );
    return Response.json(
      {
        id: await sendMessage(
          actor,
          { ...body, conversationId: id },
          body.clientMessageId,
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function PATCH(request: Request, { params }: Context) {
  try {
    requireOrigin(request);
    const actor = await requireActor(request.headers),
      { id } = await params;
    const body = z
      .object({ position: z.string() })
      .parse(
        JSON.parse(
          new TextDecoder().decode(await readLimitedBody(request, 1024)),
        ),
      );
    await markRead(actor, id, body.position);
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
