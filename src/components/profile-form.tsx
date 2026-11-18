"use client";
import { useState } from "react";
import { ActionForm } from "./action-form";
import { MediaUploader } from "./media-uploader";
import { updateProfile } from "@/app/(public)/feed/actions";
export function ProfileForm({
  name,
  bio,
  avatarId,
}: {
  name: string;
  bio: string;
  avatarId: string | null;
}) {
  const [media, setMedia] = useState<{ id: string; kind: "image" | "video" }[]>(
      avatarId ? [{ id: avatarId, kind: "image" }] : [],
    ),
    [uploading, setUploading] = useState(false);
  return (
    <ActionForm
      action={updateProfile}
      submitLabel="Lưu hồ sơ"
      disabled={uploading}
    >
      <label>
        Tên hiển thị
        <input
          name="name"
          defaultValue={name}
          minLength={2}
          maxLength={80}
          required
        />
      </label>
      <label>
        Giới thiệu về bạn
        <textarea name="bio" defaultValue={bio} maxLength={1000} />
      </label>
      <input type="hidden" name="avatarId" value={media[0]?.id ?? ""} />
      <MediaUploader
        items={media}
        onChange={setMedia}
        onPendingChange={setUploading}
        maxItems={1}
      />
      <p className="hint">Chọn ảnh cho ảnh đại diện.</p>
    </ActionForm>
  );
}
