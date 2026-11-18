import { beforeAll, afterAll, expect, test } from "vitest";
import { db } from "@/server/db";
import { prepareDatabase } from "../fixtures/database";
import { createAccount } from "../fixtures/accounts";
import {
  applyForShop,
  reviewShop,
  getOwnShop,
  requireApprovedShop,
  listShopApplications,
} from "@/modules/shops/service";
import { publishPolicy, getActivePolicy } from "@/modules/policies/service";
import type { Actor } from "@/modules/shared/types";
let admin: Actor, owner: Actor, other: Actor, shopId: string;
const input = {
  name: "Gian hàng thử",
  description: "Sản phẩm thử nghiệm",
  phone: "0901234567",
  address: "12 đường A, Hà Nội",
  legalName: "Nguyễn Văn A",
  bankName: "Ngân hàng thử",
  bankAccount: "0123456789",
  bankHolder: "NGUYEN VAN A",
};
beforeAll(async () => {
  await prepareDatabase();
  admin = await createAccount("admin");
  owner = await createAccount();
  other = await createAccount();
});
afterAll(async () => {
  for (const actor of [admin, owner, other])
    if (actor) await db.query('DELETE FROM "user" WHERE id=$1', [actor.userId]);
  await db.end();
});
test("application is pending, one per owner and does not permit publishing", async () => {
  shopId = await applyForShop(owner, input);
  expect((await getOwnShop(owner))?.status).toBe("pending");
  await expect(applyForShop(owner, input)).rejects.toMatchObject({
    code: "CONFLICT",
  });
  await expect(requireApprovedShop(owner, shopId)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
});
test("shop owner cannot approve and other users cannot obtain banking information", async () => {
  await expect(
    reviewShop(owner, shopId, "approve", "Đã kiểm tra"),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect(await getOwnShop(other)).toBeNull();
  await expect(listShopApplications(other)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
  const list = await listShopApplications(admin);
  const application = list.find((s) => s.id === shopId)!;
  expect(application.bankAccountLast4).toBe("6789");
  expect(application).not.toHaveProperty("bankAccount");
});
test("admin approves after review, decision is audited and shop access is scoped", async () => {
  await reviewShop(
    admin,
    shopId,
    "approve",
    "Đã xác minh thông tin và tài khoản nhận tiền",
  );
  await requireApprovedShop(owner, shopId);
  await expect(requireApprovedShop(other, shopId)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
  expect(
    (
      await db.query(
        "SELECT action FROM audit_event WHERE target_id=$1 AND action='shop.review'",
        [shopId],
      )
    ).rowCount,
  ).toBe(1);
});
test("policy requires complete values and immutable versions are preserved", async () => {
  await expect(publishPolicy(admin, {})).rejects.toMatchObject({
    code: "INVALID_INPUT",
  });
  await expect(publishPolicy(owner, {})).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
  const policy = {
    commissionBps: 300,
    returnDays: 7,
    sellerAcceptHours: 24,
    settlementHoldDays: 7,
    cancellationTerms: "Hủy khi shop chưa xác nhận.",
    returnTerms: "Chấp nhận khi sản phẩm sai mô tả.",
    receiptTerms: "Khách xác nhận hoặc hỗ trợ xác minh.",
    shippingTerms: "Shop tự giao, phí công bố trước thanh toán.",
  };
  const first = await publishPolicy(admin, policy);
  const second = await publishPolicy(admin, { ...policy, commissionBps: 400 });
  expect((await getActivePolicy()).id).toBe(second);
  expect(
    (
      await db.query(
        "SELECT commission_bps,active FROM trading_policy WHERE id=$1",
        [first],
      )
    ).rows[0],
  ).toEqual({ commission_bps: 300, active: false });
});
test("invalid bank details and forged phone are rejected before writing", async () => {
  await expect(
    applyForShop(other, { ...input, phone: "invalid" }),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  await expect(
    applyForShop(other, { ...input, bankAccount: "" }),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  expect(await getOwnShop(other)).toBeNull();
});

test("the platform admin can approve the platform shop they operate", async () => {
  const ownId = await applyForShop(admin, {
    ...input,
    name: "Gian hàng của nền tảng",
  });
  await reviewShop(
    admin,
    ownId,
    "approve",
    "Đã xác minh gian hàng do nền tảng vận hành",
  );
  await requireApprovedShop(admin, ownId);
});
