"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type {
  ChatMessage,
  ConversationView,
  Reference,
} from "@/modules/chat/service";
import { MediaUploader } from "./media-uploader";
import { ReportForm } from "./report-form";
export function ChatRoom({
  room: initialRoom,
  userId,
  initialReference,
}: {
  room: ConversationView;
  userId: string;
  initialReference?: Reference;
}) {
  const [room, setRoom] = useState(initialRoom),
    [messages, setMessages] = useState<ChatMessage[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [text, setText] = useState(""),
    [media, setMedia] = useState<{ id: string; kind: "image" | "video" }[]>([]),
    [uploading, setUploading] = useState(false),
    [sending, setSending] = useState(false),
    [error, setError] = useState(""),
    [reference, setReference] = useState(initialReference),
    [valid, setValid] = useState(true);
  const initialized = useRef(false);
  const retry = useRef<{ payload: string; key: string } | null>(null),
    endpoint = `/api/chat/conversations/${room.id}`;
  async function refresh(before?: string) {
    try {
      const response = await fetch(
        endpoint + (before ? "?before=" + encodeURIComponent(before) : ""),
        { cache: "no-store" },
      );
      const data = await response.json();
      if (!response.ok) {
        if ([401, 403, 404].includes(response.status)) {
          setMessages([]);
          setValid(false);
        }
        throw new Error(data.error);
      }
      setRoom(data.room);
      setValid(true);
      setMessages((old) => {
        const merged = new Map(old.map((m) => [m.id, m]));
        for (const m of data.items) merged.set(m.id, m);
        return [...merged.values()].sort((a, b) =>
          BigInt(a.position) < BigInt(b.position) ? -1 : 1,
        );
      });
      if (before || !initialized.current) setCursor(data.nextCursor);
      initialized.current = true;
      if (!before && document.visibilityState === "visible")
        await fetch(endpoint, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: data.room.counter }),
        });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa tải được tin nhắn.");
    }
  }
  useEffect(() => {
    let alive = true;
    const update = () => {
      if (alive) void refresh();
    };
    update();
    const source = new EventSource(
      `/api/chat/events?conversationId=${room.id}`,
    );
    source.onmessage = update;
    const interval = setInterval(update, 10000);
    document.addEventListener("visibilitychange", update);
    return () => {
      alive = false;
      source.close();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", update);
    };
  }, [room.id]);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    const payload = JSON.stringify({ text, mediaId: media[0]?.id, reference });
    if (retry.current?.payload !== payload)
      retry.current = { payload, key: crypto.randomUUID() };
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...JSON.parse(payload),
          clientMessageId: retry.current.key,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setText("");
      setMedia([]);
      setReference(undefined);
      retry.current = null;
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gửi tin chưa thành công.");
    } finally {
      setSending(false);
    }
  }
  return (
    <>
      <Link href="/messages">← Hộp thư</Link>
      <h1>{room.peerName}</h1>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {valid && (
        <>
          <p className="muted">
            Chỉ người tham gia đọc được hội thoại. Có thể báo cáo từng tin nhắn
            để kiểm duyệt.
          </p>
          {cursor && (
            <button className="secondary" onClick={() => void refresh(cursor)}>
              Tải tin cũ hơn
            </button>
          )}
          <div role="log" aria-label="Hội thoại" aria-live="polite">
            {messages.map((m) => (
              <article className="card" key={m.id}>
                <strong>{m.senderId === userId ? "Bạn" : room.peerName}</strong>
                <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                  {m.text}
                </p>
                {m.mediaId && (
                  <img
                    src={`/media/${m.mediaId}`}
                    alt="Ảnh trong tin nhắn"
                    style={{ maxWidth: "100%", maxHeight: 320 }}
                  />
                )}
                {m.reference &&
                  (m.reference.href ? (
                    <Link href={m.reference.href}>{m.reference.label}</Link>
                  ) : (
                    <p>{m.reference.label}</p>
                  ))}
                <p className="hint">
                  {new Date(m.createdAt).toLocaleString("vi-VN", {
                    timeZone: "Asia/Ho_Chi_Minh",
                  })}
                  {m.senderId === userId &&
                  BigInt(m.position) <= BigInt(room.peerRead)
                    ? " · Đã đọc"
                    : ""}
                </p>
                {m.senderId !== userId && !m.hidden && (
                  <ReportForm kind="message" targetId={m.id} />
                )}
              </article>
            ))}
          </div>
          {room.blocked || !room.peerActive ? (
            <p className="notice">Không thể gửi tin mới trong hội thoại này.</p>
          ) : (
            <form onSubmit={send}>
              <fieldset disabled={sending}>
                <label>
                  Tin nhắn
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    maxLength={2000}
                  />
                </label>
                <MediaUploader
                  items={media}
                  onChange={setMedia}
                  onPendingChange={setUploading}
                  maxItems={1}
                  imagesOnly
                />
                {reference && (
                  <p>
                    Đã đính kèm thẻ{" "}
                    {reference.kind === "order"
                      ? "đơn hàng"
                      : reference.kind === "product"
                        ? "sản phẩm"
                        : "bài viết"}
                    .{" "}
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setReference(undefined)}
                    >
                      Bỏ thẻ
                    </button>
                  </p>
                )}
                <button
                  disabled={
                    uploading ||
                    sending ||
                    !(text.trim() || media.length || reference)
                  }
                >
                  {sending ? "Đang gửi…" : "Gửi tin nhắn"}
                </button>
              </fieldset>
            </form>
          )}
        </>
      )}
    </>
  );
}
