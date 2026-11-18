"use client";
import { useState } from "react";
type ReadyMedia = { id: string; kind: "image" | "video" };
export function MediaUploader({
  items,
  onChange,
  onPendingChange,
  maxItems = 12,
  imagesOnly = false,
}: {
  items: ReadyMedia[];
  onChange: (items: ReadyMedia[]) => void;
  onPendingChange: (pending: boolean) => void;
  maxItems?: number;
  imagesOnly?: boolean;
}) {
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  async function upload(file: File) {
    setPending(true);
    onPendingChange(true);
    setMessage("");
    try {
      const kind = file.type.startsWith("video/") ? "video" : "image";
      const ticketResponse = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, size: file.size }),
      });
      const ticket = await ticketResponse.json();
      if (!ticketResponse.ok) throw new Error(ticket.error);
      const sent = await fetch(ticket.uploadUrl, { method: "PUT", body: file });
      if (!sent.ok) throw new Error((await sent.json()).error);
      for (let attempt = 0; attempt < 60; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const response = await fetch(`/api/media/${ticket.id}`, {
          cache: "no-store",
        });
        const status = await response.json();
        if (!response.ok) throw new Error(status.error);
        if (status.status === "rejected")
          throw new Error(
            "Tệp chưa xử lý được. Hãy dùng ảnh JPG/PNG/WebP hoặc video MP4 khác.",
          );
        if (status.status === "ready") {
          onChange([...items, { id: ticket.id, kind }]);
          return;
        }
      }
      throw new Error("Tệp vẫn đang được xử lý. Vui lòng thử lại sau.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Tải lên chưa thành công.",
      );
    } finally {
      setPending(false);
      onPendingChange(false);
    }
  }
  return (
    <div>
      <label>
        {imagesOnly ? "Ảnh" : "Ảnh và video"}
        <input
          type="file"
          accept={
            imagesOnly
              ? "image/jpeg,image/png,image/webp"
              : "image/jpeg,image/png,image/webp,video/mp4"
          }
          disabled={pending || items.length >= maxItems}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
      </label>
      <p className="hint">
        Tối đa {maxItems} tệp. Ảnh tối đa 10 MB; video MP4 tối đa 50 MB, xử lý
        tối đa 2 phút.
      </p>
      {pending && <p role="status">Đang tải và xử lý tệp…</p>}
      {message && (
        <p role="alert" className="notice error">
          {message}
        </p>
      )}
      <div className="grid">
        {items.map((item) => (
          <div key={item.id}>
            {item.kind === "image" ? (
              <img
                src={`/media/${item.id}`}
                alt="Ảnh đã chọn"
                style={{
                  width: "100%",
                  maxHeight: 160,
                  objectFit: "cover",
                  borderRadius: 8,
                }}
              />
            ) : (
              <video
                src={`/media/${item.id}`}
                controls
                preload="metadata"
                aria-label="Video đã chọn"
                style={{ width: "100%", maxHeight: 160 }}
              />
            )}
            <button
              type="button"
              className="secondary"
              onClick={() => onChange(items.filter((x) => x.id !== item.id))}
            >
              Bỏ tệp
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
