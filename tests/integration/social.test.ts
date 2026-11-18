import { beforeAll, afterAll, expect, test } from "vitest";
import { db } from "@/server/db";
import { prepareDatabase } from "../fixtures/database";
import { createAccount } from "../fixtures/accounts";
import { createPost, interact } from "@/modules/social/service";
import { listFeed, getPost } from "@/modules/social/queries";
import type { Actor } from "@/modules/shared/types";
let author: Actor, viewer: Actor;
let postId: string;
beforeAll(async () => {
  await prepareDatabase();
  author = await createAccount();
  viewer = await createAccount();
});
afterAll(async () => {
  for (const a of [author, viewer])
    if (a) await db.query('DELETE FROM "user" WHERE id=$1', [a.userId]);
  await db.end();
});
test("public posts, follow, like and save are idempotent", async () => {
  postId = await createPost(author, {
    text: "Trải nghiệm thực tế với những món dùng hằng ngày.",
    mediaIds: [],
    productIds: [],
    topics: ["trải nghiệm"],
  });
  await interact(viewer, {
    type: "follow",
    targetId: author.userId,
    enabled: true,
  });
  await interact(viewer, {
    type: "follow",
    targetId: author.userId,
    enabled: true,
  });
  await interact(viewer, { type: "like", targetId: postId, enabled: true });
  await interact(viewer, { type: "like", targetId: postId, enabled: true });
  await interact(viewer, { type: "save", targetId: postId, enabled: true });
  expect((await listFeed(viewer, { mode: "following" })).items[0].id).toBe(
    postId,
  );
  expect((await getPost(viewer, postId))?.likes).toBe(1);
});
test("comments belong to existing visible posts and blocked users cannot interact", async () => {
  await interact(viewer, {
    type: "comment",
    targetId: postId,
    text: "Cảm ơn đã chia sẻ trải nghiệm!",
  });
  expect((await getPost(viewer, postId))?.comments).toHaveLength(1);
  await interact(author, {
    type: "block",
    targetId: viewer.userId,
    enabled: true,
  });
  expect((await listFeed(viewer, { mode: "following" })).items).toEqual([]);
  await expect(
    interact(viewer, {
      type: "comment",
      targetId: postId,
      text: "Không được gửi",
    }),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
});
test("cursor pagination does not duplicate posts with equal timestamps", async () => {
  await interact(author, {
    type: "block",
    targetId: viewer.userId,
    enabled: false,
  });
  await interact(viewer, {
    type: "follow",
    targetId: author.userId,
    enabled: true,
  });
  const ids = [];
  for (let i = 0; i < 3; i++)
    ids.push(
      await createPost(author, {
        text: `Bài thử phân trang số ${i}`,
        mediaIds: [],
        productIds: [],
        topics: [],
      }),
    );
  await db.query(
    "UPDATE social_post SET created_at='2026-11-01T00:00:00Z' WHERE id=ANY($1::text[])",
    [ids],
  );
  const first = await listFeed(viewer, { mode: "following", limit: 2 });
  const next = await listFeed(viewer, {
    mode: "following",
    limit: 2,
    cursor: first.nextCursor!,
  });
  expect(new Set([...first.items, ...next.items].map((x) => x.id)).size).toBe(
    4,
  );
});
