import Link from "next/link";
import { redirect } from "next/navigation";
import { pageActor } from "@/server/page-access";
import { openConversation, listConversations } from "@/modules/chat/service";
import { db } from "@/server/db";
import { z } from "zod";
export default async function Messages({
  searchParams,
}: {
  searchParams: Promise<{
    peer?: string;
    shop?: string;
    kind?: string;
    ref?: string;
  }>;
}) {
  const actor = await pageActor(),
    q = await searchParams;
  let peer = q.peer;
  if (q.shop && z.uuid().safeParse(q.shop).success)
    peer = (
      await db.query(
        "SELECT owner_user_id FROM shop WHERE id=$1 AND status='approved'",
        [q.shop],
      )
    ).rows[0]?.owner_user_id;
  if (peer) {
    let id: string;
    try {
      id = await openConversation(actor, peer);
    } catch {
      return (
        <section className="section">
          <h1>Tin nhắn</h1>
          <p>Chưa thể mở trò chuyện với tài khoản này.</p>
          <Link href="/messages">Về hộp thư</Link>
        </section>
      );
    }
    const share = new URLSearchParams();
    if (q.kind && q.ref) {
      share.set("kind", q.kind);
      share.set("ref", q.ref);
    }
    redirect(`/messages/${id}${share.size ? "?" + share : ""}`);
  }
  const rooms = await listConversations(actor);
  return (
    <section className="section">
      <h1>Tin nhắn</h1>
      <p className="muted">
        Liên hệ người dùng từ hồ sơ hoặc nhắn shop từ trang sản phẩm.
      </p>
      {rooms.length ? (
        rooms.map((r) => (
          <article className="card" key={r.id}>
            <Link href={`/messages/${r.id}`}>{r.peerName}</Link>
            {r.unread > 0 && <span> · {r.unread} tin chưa đọc</span>}
          </article>
        ))
      ) : (
        <p>Chưa có cuộc trò chuyện.</p>
      )}
    </section>
  );
}
