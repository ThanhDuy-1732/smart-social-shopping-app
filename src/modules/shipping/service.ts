import { z } from "zod";
import { db } from "@/server/db";
import { requireApprovedShop } from "@/modules/shops/service";
import { DomainError, type Actor } from "@/modules/shared/types";
import { normalizeSearch } from "@/modules/catalog/schema";
export const regionKey = (value: string) =>
  normalizeSearch(value).trim().replace(/\s+/g, " ");
export async function setShippingRate(
  actor: Actor,
  shopId: string,
  input: unknown,
): Promise<void> {
  await requireApprovedShop(actor, shopId);
  const parsed = z
    .object({
      region: z.string().trim().min(1).max(100),
      fee: z
        .string()
        .regex(/^\d{1,13}$/)
        .refine((x) => BigInt(x) <= 1000000000000n),
      estimatedDays: z.number().int().min(1).max(60),
    })
    .safeParse(input);
  if (!parsed.success)
    throw new DomainError(
      "INVALID_INPUT",
      "Kiểm tra khu vực, phí giao hàng và số ngày dự kiến.",
    );
  const v = parsed.data;
  await db.query(
    "INSERT INTO shipping_rate(shop_id,region,fee,estimated_days) VALUES($1,$2,$3,$4) ON CONFLICT(shop_id,region) DO UPDATE SET fee=$3,estimated_days=$4",
    [shopId, regionKey(v.region), v.fee, v.estimatedDays],
  );
}
export async function listShippingRates(actor: Actor, shopId: string) {
  await requireApprovedShop(actor, shopId);
  return (
    await db.query<{ region: string; fee: string; estimatedDays: number }>(
      'SELECT region,fee::text,estimated_days AS "estimatedDays" FROM shipping_rate WHERE shop_id=$1 ORDER BY region',
      [shopId],
    )
  ).rows;
}
