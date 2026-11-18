"use client";
import { useState } from "react";
import { ActionForm } from "./action-form";
import { MediaUploader } from "./media-uploader";
import { changeOrder } from "@/app/(account)/orders/actions";
export function ReceiptVerificationForm({ orderId }: { orderId: string }) {
  const [media, setMedia] = useState<{ id: string; kind: "image" | "video" }[]>(
    [],
  );
  const [uploading, setUploading] = useState(false);
  return (
    <ActionForm
      action={changeOrder}
      submitLabel="Xác minh đã giao hàng"
      disabled={uploading || media.length !== 1}
    >
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="type" value="verify_receipt" />
      <input type="hidden" name="evidenceId" value={media[0]?.id ?? ""} />
      <label>
        Lý do và kết quả xác minh
        <textarea name="reason" minLength={10} maxLength={1000} required />
      </label>
      <MediaUploader
        items={media}
        onChange={setMedia}
        onPendingChange={setUploading}
        maxItems={1}
      />
    </ActionForm>
  );
}
