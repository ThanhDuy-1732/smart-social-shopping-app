import { beforeAll, afterAll, expect, test } from "vitest";
import { db } from "@/server/db";
import { prepareDatabase } from "../fixtures/database";
import {
  commerceFixture,
  cleanupCommerce,
  type CommerceFixture,
} from "../fixtures/commerce";
import { createAccount } from "../fixtures/accounts";
import { createPost, interact } from "@/modules/social/service";
import { getPost, listFeed } from "@/modules/social/queries";
import { searchCatalog } from "@/modules/catalog/queries";
import { reportContent, moderate } from "@/modules/moderation/service";
import { requirePermission } from "@/modules/access/service";
import type { Actor } from "@/modules/shared/types";
let f: CommerceFixture, support: Actor, postId: string;
beforeAll(async () => {
  await prepareDatabase();
  f = await commerceFixture();
  support = await createAccount("support");
  postId = await createPost(f.buyer, {
    text: "Bài trải nghiệm gắn sản phẩm để kiểm tra trạng thái.",
    productIds: [f.products[0].productId],
    mediaIds: [],
    topics: [],
  });
});
afterAll(async () => {
  if (f) await cleanupCommerce(f);
  if (support)
    await db.query('DELETE FROM "user" WHERE id=$1', [support.userId]);
  await db.end();
});
test("hidden product disappears from search and old social tags stop linking to purchase", async () => {
  const report = await reportContent(f.other, {
    kind: "product",
    targetId: f.products[0].productId,
    reason: "Thông tin sản phẩm cần được kiểm tra lại",
  });
  await moderate(f.admin, report, {
    action: "hide",
    reason: "Tạm ẩn để xác minh mô tả sản phẩm",
  });
  expect((await searchCatalog({ shopId: f.products[0].shopId })).items).toEqual(
    [],
  );
  const post = await getPost(f.other, postId);
  expect(post?.products[0].available).toBe(false);
  expect(post?.products[0].name).toBe("Sản phẩm tạm ngừng bán");
});
test("reported post disappears from both feed and its previously shared URL", async () => {
  const report = await reportContent(f.other, {
    kind: "post",
    targetId: postId,
    reason: "Bài cần kiểm tra nội dung chia sẻ",
  });
  await moderate(f.admin, report, {
    action: "hide",
    reason: "Đã xác minh nội dung cần tạm ẩn",
  });
  expect(await getPost(null, postId)).toBeNull();
  expect((await listFeed(null, { authorId: f.buyer.userId })).items).toEqual(
    [],
  );
});
test("support role cannot moderate content or change trading policies", async () => {
  await expect(
    requirePermission(support, "content.moderate"),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(
    requirePermission(support, "policies.manage"),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
});

test("suspending a seller account pauses the shop and removes public comments", async () => {
  const post = await createPost(f.buyer, {
    text: "Bài thử trạng thái tác giả bình luận",
    mediaIds: [],
    productIds: [],
    topics: [],
  });
  await interact(f.owners[1], {
    type: "comment",
    targetId: post,
    text: "Bình luận trước khi tài khoản bị khóa",
  });
  const report = await reportContent(f.other, {
    kind: "user",
    targetId: f.owners[1].userId,
    reason: "Tài khoản cần được kiểm tra hoạt động",
  });
  await moderate(f.admin, report, {
    action: "hide",
    reason: "Tạm khóa tài khoản và gian hàng để xác minh",
  });
  expect((await searchCatalog({ shopId: f.products[1].shopId })).items).toEqual(
    [],
  );
  expect((await getPost(f.other, post))?.comments).toHaveLength(0);
});
