import { z } from "zod";
import { DomainError } from "@/modules/shared/types";
export const attributeDefinitions = z
  .array(
    z.object({
      key: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
      label: z.string().trim().min(1).max(80),
      kind: z.enum(["text", "number", "select"]),
      required: z.boolean(),
      options: z.array(z.string().min(1).max(100)).max(100).optional(),
    }),
  )
  .max(30)
  .superRefine((defs, ctx) => {
    if (new Set(defs.map((x) => x.key)).size !== defs.length)
      ctx.addIssue({ code: "custom", message: "Duplicate attribute" });
    for (const def of defs)
      if (def.kind === "select" && !def.options?.length)
        ctx.addIssue({ code: "custom", message: "Select needs options" });
  });
export type AttributeDefinition = z.infer<typeof attributeDefinitions>[number];
export const productSchema = z
  .object({
    id: z.uuid().optional(),
    shopId: z.uuid(),
    categoryId: z.uuid(),
    name: z.string().trim().min(2).max(160),
    description: z.string().trim().min(10).max(10000),
    mediaIds: z.array(z.uuid()).max(12).default([]),
    attributes: z.record(
      z.string(),
      z.union([z.string().max(500), z.number().finite()]),
    ),
    variants: z
      .array(
        z.object({
          id: z.uuid().optional(),
          sku: z.string().trim().min(1).max(80),
          label: z.string().trim().min(1).max(160),
          price: z
            .string()
            .regex(/^[1-9]\d{0,12}$/)
            .refine((x) => BigInt(x) <= 1000000000000n),
          stock: z.number().int().min(0).max(10000000),
        }),
      )
      .min(1)
      .max(48),
  })
  .superRefine((p, ctx) => {
    if (new Set(p.variants.map((x) => x.sku)).size !== p.variants.length)
      ctx.addIssue({ code: "custom", message: "Duplicate SKU" });
  });
export function validateAttributes(
  defs: AttributeDefinition[],
  values: Record<string, string | number>,
) {
  if (Object.keys(values).some((key) => !defs.some((d) => d.key === key)))
    throw new DomainError(
      "INVALID_INPUT",
      "Có thuộc tính không thuộc ngành hàng.",
    );
  for (const def of defs) {
    const value = values[def.key];
    if (value === undefined || value === "") {
      if (def.required)
        throw new DomainError("INVALID_INPUT", `Vui lòng điền ${def.label}.`);
      continue;
    }
    if (
      (def.kind === "number" && typeof value !== "number") ||
      (def.kind !== "number" && typeof value !== "string") ||
      (def.kind === "select" && !def.options?.includes(String(value)))
    )
      throw new DomainError(
        "INVALID_INPUT",
        `Giá trị ${def.label} không hợp lệ.`,
      );
  }
}
export function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}
