"use client";
import { useState, useEffect } from "react";
import { ActionForm } from "./action-form";
import { MediaUploader } from "./media-uploader";
import { publishPost } from "@/app/(public)/feed/actions";
export function PostComposer({
  products,
}: {
  products: { id: string; name: string; shopName: string }[];
}) {
  const [options, setOptions] = useState(products),
    [query, setQuery] = useState(""),
    [lookupError, setLookupError] = useState("");
  useEffect(() => {
    if (!query.trim()) {
      setOptions(products);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/catalog/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        const result = await response.json();
        if (!response.ok) throw new Error();
        setOptions(result.items);
        setLookupError("");
      } catch (error) {
        if (!controller.signal.aborted)
          setLookupError("Chưa tìm được sản phẩm. Vui lòng thử lại.");
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, products]);
  const [media, setMedia] = useState<{ id: string; kind: "image" | "video" }[]>(
      [],
    ),
    [uploading, setUploading] = useState(false),
    [selected, setSelected] = useState<string[]>([]);
  return (
    <ActionForm
      action={publishPost}
      submitLabel="Đăng chia sẻ"
      disabled={uploading}
    >
      <label>
        Trải nghiệm của bạn
        <textarea
          name="text"
          minLength={1}
          maxLength={5000}
          placeholder="Món bạn đang dùng có điều gì hay?"
          required
        />
      </label>
      <MediaUploader
        items={media}
        onChange={setMedia}
        onPendingChange={setUploading}
      />
      <input
        type="hidden"
        name="mediaIds"
        value={JSON.stringify(media.map((x) => x.id))}
      />
      <input type="hidden" name="productIds" value={JSON.stringify(selected)} />
      <label>
        Chủ đề, cách nhau bằng dấu phẩy
        <input
          name="topics"
          placeholder="Ví dụ: du lịch, đồ dùng hằng ngày"
          maxLength={200}
        />
      </label>
      <details>
        <summary>Gắn sản phẩm đang dùng ({selected.length}/12)</summary>
        <label>
          Tìm sản phẩm để gắn
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={300}
            placeholder="Tên sản phẩm"
          />
        </label>
        {lookupError && <p role="alert">{lookupError}</p>}
        {options.length ? (
          options.map((p) => (
            <label className="inline-check" key={p.id}>
              <input
                type="checkbox"
                checked={selected.includes(p.id)}
                disabled={!selected.includes(p.id) && selected.length >= 12}
                onChange={(e) =>
                  setSelected((ids) =>
                    e.target.checked
                      ? [...ids, p.id]
                      : ids.filter((id) => id !== p.id),
                  )
                }
              />
              {p.name} — {p.shopName}
            </label>
          ))
        ) : (
          <p className="muted">Chưa có sản phẩm được mở bán để gắn.</p>
        )}
      </details>
    </ActionForm>
  );
}
