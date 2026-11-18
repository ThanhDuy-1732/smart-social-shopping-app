"use client";
import { useState } from "react";
import { ActionForm } from "./action-form";
import { MediaUploader } from "./media-uploader";
import { sendReturn } from "@/app/(account)/orders/actions";
export function ReturnRequestForm({
  orderId,
  items,
}: {
  orderId: string;
  items: { id: string; name: string; quantity: number }[];
}) {
  const [uploading, setUploading] = useState(false);
  const [media, setMedia] = useState<{ id: string; kind: "image" | "video" }[]>(
    [],
  );
  return (
    <ActionForm
      action={sendReturn}
      submitLabel="Gửi yêu cầu xem xét"
      disabled={uploading}
    >
      <input type="hidden" name="orderId" value={orderId} />
      <input
        type="hidden"
        name="evidenceIds"
        value={JSON.stringify(media.map((x) => x.id))}
      />
      <p className="hint">
        Chọn số lượng từng món cần đổi trả. Điền 0 cho món không yêu cầu.
      </p>
      {items.map((item) => (
        <label key={item.id}>
          {item.name}
          <input
            name={`qty:${item.id}`}
            type="number"
            min={0}
            max={item.quantity}
            step={1}
            defaultValue={0}
            required
          />
        </label>
      ))}
      <label>
        Lý do và mô tả vấn đề
        <textarea name="reason" minLength={10} maxLength={2000} required />
      </label>
      <MediaUploader
        items={media}
        onChange={setMedia}
        maxItems={6}
        onPendingChange={setUploading}
      />
      <p className="hint">
        Tối đa 6 tệp bằng chứng cho yêu cầu. Chỉ người liên quan và nhân sự xử
        lý được xem.
      </p>
    </ActionForm>
  );
}
