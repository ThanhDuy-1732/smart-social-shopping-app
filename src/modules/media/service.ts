import { z } from "zod";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, rm, rename } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import { db, withTransaction } from "@/server/db";
import {
  assertActiveActor,
  getAllowedPermissions,
} from "@/modules/access/service";
import { enqueueJob, claimJob, completeJob, failJob } from "@/server/jobs";
import { DomainError, type Actor } from "@/modules/shared/types";
export type Media = {
  id: string;
  kind: "image" | "video";
  mime: string;
  status: string;
};
const limits = { image: 10 * 1024 * 1024, video: 50 * 1024 * 1024 };
function allowLocalMedia() {
  if (process.env.NODE_ENV === "production")
    throw new DomainError(
      "PROVIDER_UNAVAILABLE",
      "Dịch vụ ảnh/video chưa được cấu hình để mở bán.",
    );
}
export async function requestUpload(
  actor: Actor,
  input: unknown,
): Promise<{ id: string; uploadUrl: string }> {
  allowLocalMedia();
  await assertActiveActor(actor);
  const result = z
    .object({
      kind: z.enum(["image", "video"]),
      size: z.number().int().positive(),
    })
    .safeParse(input);
  if (!result.success || result.data.size > limits[result.data.kind])
    throw new DomainError(
      "INVALID_INPUT",
      "Ảnh tối đa 10 MB; video MP4 tối đa 50 MB.",
    );
  const id = randomUUID();
  await db.query(
    "INSERT INTO media(id,owner_id,kind,max_bytes) VALUES($1,$2,$3,$4)",
    [id, actor.userId, result.data.kind, result.data.size],
  );
  return { id, uploadUrl: `/api/media/${id}` };
}
export async function completeUpload(
  actor: Actor,
  id: string,
  bytes: Uint8Array,
): Promise<void> {
  allowLocalMedia();
  await assertActiveActor(actor);
  await withTransaction(async (client) => {
    const media = (
      await client.query(
        "SELECT owner_id,status,max_bytes,expires_at FROM media WHERE id=$1 FOR UPDATE",
        [id],
      )
    ).rows[0];
    if (!media || media.owner_id !== actor.userId)
      throw new DomainError("FORBIDDEN", "Không có quyền tải lên tệp này.");
    if (
      media.status !== "pending" ||
      new Date(media.expires_at).getTime() <= Date.now()
    )
      throw new DomainError(
        "CONFLICT",
        "Liên kết tải lên đã hết hạn hoặc đã được sử dụng.",
      );
    if (!bytes.length || bytes.length > media.max_bytes)
      throw new DomainError("INVALID_INPUT", "Dung lượng tệp không hợp lệ.");
    const dir = `.local/storage/${id}`;
    await mkdir(dir, { recursive: true, mode: 0o700 });
    await writeFile(`${dir}/source`, bytes, { mode: 0o600 });
    await client.query("UPDATE media SET status='processing' WHERE id=$1", [
      id,
    ]);
    await enqueueJob("media.process", id, { mediaId: id }, client);
  });
}
export async function getReadyMedia(
  actor: Actor,
  ids: string[],
): Promise<Media[]> {
  await assertActiveActor(actor);
  if (!ids.length) return [];
  if (
    ids.length > 12 ||
    ids.some((id) => !z.uuid().safeParse(id).success) ||
    new Set(ids).size !== ids.length
  )
    throw new DomainError("INVALID_INPUT", "Danh sách ảnh/video không hợp lệ.");
  const rows = (
    await db.query<Media & { ownerId: string }>(
      'SELECT id,kind,mime,status,owner_id AS "ownerId" FROM media WHERE id=ANY($1::text[])',
      [ids],
    )
  ).rows;
  if (
    rows.length !== ids.length ||
    rows.some((row) => row.ownerId !== actor.userId)
  )
    throw new DomainError(
      "FORBIDDEN",
      "Ảnh/video không thuộc tài khoản của bạn.",
    );
  if (rows.some((row) => row.status !== "ready"))
    throw new DomainError(
      "CONFLICT",
      "Ảnh/video chưa sẵn sàng hoặc không hợp lệ.",
    );
  return ids.map((id) => rows.find((row) => row.id === id)!);
}
export async function readMedia(
  actor: Actor | null,
  id: string,
): Promise<{ bytes: Buffer; mime: string }> {
  if (!z.uuid().safeParse(id).success)
    throw new DomainError("NOT_FOUND", "Không tìm thấy tệp.");
  const row = (
    await db.query<Media & { ownerId: string }>(
      'SELECT id,kind,mime,status,owner_id AS "ownerId" FROM media WHERE id=$1',
      [id],
    )
  ).rows[0];
  if (!row || row.status !== "ready")
    throw new DomainError("NOT_FOUND", "Không tìm thấy tệp.");
  let allowed = false;
  if (actor) {
    await assertActiveActor(actor);
    allowed = row.ownerId === actor.userId;
  }
  if (!allowed)
    allowed = Boolean(
      (
        await db.query(
          "SELECT 1 FROM product_media pm JOIN product p ON p.id=pm.product_id JOIN shop s ON s.id=p.shop_id WHERE pm.media_id=$1 AND p.status='published' AND s.status='approved'",
          [id],
        )
      ).rowCount,
    );
  if (!allowed && actor) {
    const attached = (
      await db.query(
        'SELECT c.buyer_id AS "buyerId",s.owner_user_id AS "ownerId" FROM return_evidence e JOIN return_case r ON r.id=e.case_id JOIN shop_order o ON o.id=r.order_id JOIN checkout c ON c.id=o.checkout_id JOIN shop s ON s.id=o.shop_id WHERE e.media_id=$1 UNION ALL SELECT c.buyer_id,s.owner_user_id FROM order_evidence e JOIN shop_order o ON o.id=e.order_id JOIN checkout c ON c.id=o.checkout_id JOIN shop s ON s.id=o.shop_id WHERE e.media_id=$1',
        [id],
      )
    ).rows;
    allowed = attached.some(
      (x) => x.buyerId === actor.userId || x.ownerId === actor.userId,
    );
    if (!allowed) {
      const productAttached = Boolean(
        (await db.query("SELECT 1 FROM product_media WHERE media_id=$1", [id]))
          .rowCount,
      );
      if (attached.length || productAttached) {
        const permissions = await getAllowedPermissions(actor);
        allowed = attached.length
          ? permissions.includes("disputes.manage") ||
            permissions.includes("finance.manage")
          : permissions.includes("content.moderate");
        if (allowed)
          await db.query(
            "INSERT INTO audit_event(id,actor_id,action,target_id,details) VALUES($1,$2,'evidence.read',$3,$4)",
            [
              randomUUID(),
              actor.userId,
              id,
              JSON.stringify({
                scope: attached.length ? "order" : "product-review",
              }),
            ],
          );
      }
    }
  }
  if (!allowed && actor) {
    const batches = (
      await db.query(
        "SELECT s.owner_user_id AS owner FROM settlement b JOIN shop s ON s.id=b.shop_id WHERE b.evidence_id=$1",
        [id],
      )
    ).rows;
    allowed = batches.some((b) => b.owner === actor.userId);
    if (
      !allowed &&
      batches.length &&
      (await getAllowedPermissions(actor)).includes("finance.manage")
    ) {
      allowed = true;
      await db.query(
        "INSERT INTO audit_event(id,actor_id,action,target_id) VALUES($1,$2,'evidence.read',$3)",
        [randomUUID(), actor.userId, id],
      );
    }
  }
  if (!allowed)
    allowed = Boolean(
      (
        await db.query(
          'SELECT 1 FROM post_media pm JOIN social_post p ON p.id=pm.post_id JOIN "user" u ON u.id=p.author_id WHERE pm.media_id=$1 AND p.status=\'published\' AND u."emailVerified"=true AND NOT EXISTS(SELECT 1 FROM account_state a WHERE a.user_id=u.id AND a.suspended=true) UNION ALL SELECT 1 FROM user_profile pr JOIN "user" u ON u.id=pr.user_id WHERE pr.avatar_id=$1 AND u."emailVerified"=true AND NOT EXISTS(SELECT 1 FROM account_state a WHERE a.user_id=u.id AND a.suspended=true)',
          [id],
        )
      ).rowCount,
    );
  if (!allowed) throw new DomainError("NOT_FOUND", "Không tìm thấy tệp.");
  return {
    bytes: await readFile(
      `.local/storage/${row.id}/output.${row.kind === "image" ? "webp" : "mp4"}`,
    ),
    mime: row.mime,
  };
}
async function processMedia(id: string): Promise<void> {
  if (!z.uuid().safeParse(id).success) throw new Error("Invalid media id");
  const row = (
    await db.query<{ kind: "image" | "video"; status: string }>(
      "SELECT kind,status FROM media WHERE id=$1",
      [id],
    )
  ).rows[0];
  if (!row || row.status === "ready" || row.status === "rejected") return;
  const dir = `.local/storage/${id}`;
  try {
    if (row.kind === "image") {
      const data = await readFile(`${dir}/source`);
      const metadata = await sharp(data, {
        limitInputPixels: 16000000,
      }).metadata();
      if (!["jpeg", "png", "webp"].includes(metadata.format ?? ""))
        throw new Error("Unsupported image");
      await sharp(data, { limitInputPixels: 16000000 })
        .rotate()
        .resize({
          width: 1920,
          height: 1920,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toFile(`${dir}/output.tmp.webp`);
      await rename(`${dir}/output.tmp.webp`, `${dir}/output.webp`);
    } else {
      const source = await readFile(`${dir}/source`);
      if (source.subarray(4, 8).toString() !== "ftyp")
        throw new Error("Unsupported video");
      await promisify(execFile)(
        process.env.FFMPEG_PATH ?? "ffmpeg",
        [
          "-nostdin",
          "-loglevel",
          "error",
          "-protocol_whitelist",
          "file,pipe",
          "-f",
          "mov",
          "-i",
          `${dir}/source`,
          "-t",
          "120",
          "-vf",
          "scale=w='min(1280,iw)':h=-2",
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-pix_fmt",
          "yuv420p",
          "-c:a",
          "aac",
          "-movflags",
          "+faststart",
          "-y",
          `${dir}/output.tmp.mp4`,
        ],
        { timeout: 30000, maxBuffer: 65536 },
      );
      await rename(`${dir}/output.tmp.mp4`, `${dir}/output.mp4`);
    }
    await db.query("UPDATE media SET status='ready',mime=$2 WHERE id=$1", [
      id,
      row.kind === "image" ? "image/webp" : "video/mp4",
    ]);
    await rm(`${dir}/source`, { force: true });
  } catch (error) {
    await db.query("UPDATE media SET status='rejected' WHERE id=$1", [id]);
    await rm(`${dir}/source`, { force: true });
    throw error;
  }
}
export async function workMediaOnce(): Promise<boolean> {
  const job = await claimJob("media.process");
  if (!job) return false;
  try {
    const payload = z.object({ mediaId: z.uuid() }).parse(job.payload);
    await processMedia(payload.mediaId);
    await completeJob(job.id, job.leaseToken);
  } catch (error) {
    await failJob(job, error);
  }
  return true;
}

export async function cleanupExpiredUploads(): Promise<number> {
  const { rows } = await db.query<{ id: string }>(
    "WITH expired AS (SELECT id FROM media WHERE (status='pending' AND expires_at<now()) OR (status='rejected' AND created_at<now()-interval '1 day') ORDER BY id LIMIT 100) DELETE FROM media WHERE id IN (SELECT id FROM expired) RETURNING id",
  );
  for (const row of rows)
    if (z.uuid().safeParse(row.id).success)
      await rm(`.local/storage/${row.id}`, { recursive: true, force: true });
  return rows.length;
}
