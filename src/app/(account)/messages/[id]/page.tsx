import { pageActor } from "@/server/page-access";
import { getConversation } from "@/modules/chat/service";
import { ChatRoom } from "@/components/chat-room";
import { notFound } from "next/navigation";
import { z } from "zod";
export default async function Conversation({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kind?: string; ref?: string }>;
}) {
  const actor = await pageActor(),
    { id } = await params,
    q = await searchParams;
  let room;
  try {
    room = await getConversation(actor, id);
  } catch {
    notFound();
  }
  const reference = z
    .object({ kind: z.enum(["post", "product", "order"]), id: z.uuid() })
    .safeParse({ kind: q.kind, id: q.ref });
  return (
    <section className="section">
      <ChatRoom
        room={room}
        userId={actor.userId}
        initialReference={reference.success ? reference.data : undefined}
      />
    </section>
  );
}
