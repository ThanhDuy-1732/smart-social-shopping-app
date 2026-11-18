import { requireActor } from "@/modules/access/service";
import { getConversation } from "@/modules/chat/service";
import { apiError } from "@/server/http";
export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("conversationId") ?? "";
    await getConversation(await requireActor(request.headers), id);
    const encoder = new TextEncoder();
    let timer: ReturnType<typeof setTimeout> | undefined,
      stopped = false;
    const stream = new ReadableStream({
      start(controller) {
        const stop = () => {
          if (stopped) return;
          stopped = true;
          clearTimeout(timer);
          try {
            controller.close();
          } catch {}
        };
        request.signal.addEventListener("abort", stop, { once: true });
        async function tick() {
          if (stopped) return;
          try {
            const room = await getConversation(
              await requireActor(request.headers),
              id,
            );
            if (stopped) return;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ counter: room.counter, peerRead: room.peerRead, blocked: room.blocked })}\n\n`,
              ),
            );
            timer = setTimeout(tick, 3000);
          } catch {
            stop();
          }
        }
        void tick();
      },
      cancel() {
        stopped = true;
        clearTimeout(timer);
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "private, no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
