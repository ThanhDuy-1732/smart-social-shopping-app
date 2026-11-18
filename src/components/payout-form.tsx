"use client";
import { useState } from "react";
import { ActionForm } from "./action-form";
import { MediaUploader } from "./media-uploader";
import { decideBatch } from "@/app/admin/settlements/actions";
export function PayoutForm({ settlementId }: { settlementId: string }) {
  const [media, setMedia] = useState<{ id: string; kind: "image" | "video" }[]>(
      [],
    ),
    [uploading, setUploading] = useState(false);
  return (
    <ActionForm
      action={decideBatch}
      submitLabel="Ghi nhận đã chuyển khoản"
      disabled={uploading || media.length !== 1}
    >
      <input type="hidden" name="settlementId" value={settlementId} />
      <input type="hidden" name="decision" value="payout" />
      <input type="hidden" name="evidenceId" value={media[0]?.id ?? ""} />
      <p className="hint">
        Chỉ ghi nhận sau khi đã chuyển đúng số tiền và tài khoản của đợt. Ứng
        dụng không tự chuyển khoản.
      </p>
      <label>
        Mã giao dịch ngân hàng
        <input name="bankReference" minLength={3} maxLength={120} required />
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
