import { beforeAll, afterAll, expect, test } from "vitest";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, rm } from "node:fs/promises";
import sharp from "sharp";
import { db } from "@/server/db";
import { prepareDatabase } from "../fixtures/database";
import { createAccount } from "../fixtures/accounts";
import {
  requestUpload,
  completeUpload,
  getReadyMedia,
  readMedia,
  workMediaOnce,
} from "@/modules/media/service";
import { enqueueJob, claimJob, completeJob } from "@/server/jobs";
import type { Actor } from "@/modules/shared/types";
let owner: Actor, other: Actor;
const mediaIds: string[] = [];
beforeAll(async () => {
  await prepareDatabase();
  owner = await createAccount();
  other = await createAccount();
});
afterAll(async () => {
  for (const id of mediaIds) {
    await db.query(
      "DELETE FROM background_job WHERE kind='media.process' AND key=$1",
      [id],
    );
    await rm(`.local/storage/${id}`, { recursive: true, force: true });
  }
  await db.query("DELETE FROM background_job WHERE kind='lease-test'");
  for (const a of [owner, other])
    if (a) await db.query('DELETE FROM "user" WHERE id=$1', [a.userId]);
  await db.end();
});
test("image is decoded, resized and re-encoded before it can be used", async () => {
  const ticket = await requestUpload(owner, { kind: "image", size: 1000 });
  mediaIds.push(ticket.id);
  await expect(getReadyMedia(owner, [ticket.id])).rejects.toMatchObject({
    code: "CONFLICT",
  });
  const image = await sharp({
    create: { width: 20, height: 20, channels: 3, background: "#2455d6" },
  })
    .png()
    .toBuffer();
  await completeUpload(owner, ticket.id, image);
  await workMediaOnce();
  expect((await getReadyMedia(owner, [ticket.id]))[0].mime).toBe("image/webp");
  const file = await readMedia(owner, ticket.id);
  expect((await sharp(file.bytes).metadata()).format).toBe("webp");
  await expect(getReadyMedia(other, [ticket.id])).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
  await expect(readMedia(null, ticket.id)).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
});
test("oversized ticket and disguised SVG never become publishable", async () => {
  await expect(
    requestUpload(owner, { kind: "image", size: 100000000 }),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  const ticket = await requestUpload(owner, { kind: "image", size: 1000 });
  mediaIds.push(ticket.id);
  await completeUpload(
    owner,
    ticket.id,
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>',
    ),
  );
  await workMediaOnce();
  expect(
    (await db.query("SELECT status FROM media WHERE id=$1", [ticket.id]))
      .rows[0].status,
  ).toBe("rejected");
  await expect(getReadyMedia(owner, [ticket.id])).rejects.toMatchObject({
    code: "CONFLICT",
  });
});
test("local MP4 is transcoded and non-owners cannot upload into a ticket", async () => {
  const ticket = await requestUpload(owner, { kind: "video", size: 1000000 });
  mediaIds.push(ticket.id);
  await mkdir(".local/test-fixtures", { recursive: true });
  const path = `.local/test-fixtures/${randomUUID()}.mp4`;
  try {
    await promisify(execFile)(
      "ffmpeg",
      [
        "-nostdin",
        "-f",
        "lavfi",
        "-i",
        "color=c=blue:s=64x64:d=0.2",
        "-an",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-y",
        path,
      ],
      { timeout: 20000 },
    );
    const bytes = await readFile(path);
    await expect(completeUpload(other, ticket.id, bytes)).rejects.toMatchObject(
      { code: "FORBIDDEN" },
    );
    await completeUpload(owner, ticket.id, bytes);
    await workMediaOnce();
    expect((await getReadyMedia(owner, [ticket.id]))[0].mime).toBe("video/mp4");
  } finally {
    await rm(path, { force: true });
  }
});
test("expired job lease is reclaimable and a stale worker cannot complete it", async () => {
  const key = randomUUID();
  await enqueueJob("lease-test", key, {});
  await enqueueJob("lease-test", key, {});
  const first = await claimJob("lease-test");
  expect(first).not.toBeNull();
  expect(await claimJob("lease-test")).toBeNull();
  await db.query(
    "UPDATE background_job SET lease_until=now()-interval '1 minute' WHERE id=$1",
    [first!.id],
  );
  const next = await claimJob("lease-test");
  expect(next!.id).toBe(first!.id);
  expect(next!.leaseToken).not.toBe(first!.leaseToken);
  expect(await completeJob(first!.id, first!.leaseToken)).toBe(false);
  expect(await completeJob(next!.id, next!.leaseToken)).toBe(true);
});

test("expired pending uploads are removed without deleting ready media", async () => {
  const { cleanupExpiredUploads } = await import("@/modules/media/service");
  const ticket = await requestUpload(owner, { kind: "image", size: 1000 });
  mediaIds.push(ticket.id);
  await db.query(
    "UPDATE media SET expires_at=now()-interval '1 hour' WHERE id=$1",
    [ticket.id],
  );
  expect(await cleanupExpiredUploads()).toBeGreaterThanOrEqual(1);
  expect(
    (await db.query("SELECT id FROM media WHERE id=$1", [ticket.id])).rowCount,
  ).toBe(0);
  expect(
    (
      await db.query(
        "SELECT count(*)::int AS count FROM media WHERE owner_id=$1 AND status='ready'",
        [owner.userId],
      )
    ).rows[0].count,
  ).toBe(2);
});

test("completed upload ticket cannot be reused", async () => {
  const ticket = await requestUpload(owner, { kind: "image", size: 1000 });
  mediaIds.push(ticket.id);
  const image = await sharp({
    create: { width: 8, height: 8, channels: 3, background: "#ffffff" },
  })
    .png()
    .toBuffer();
  await completeUpload(owner, ticket.id, image);
  await expect(completeUpload(owner, ticket.id, image)).rejects.toMatchObject({
    code: "CONFLICT",
  });
  await workMediaOnce();
});
