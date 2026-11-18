import { z } from "zod";
const schema = z.object({
  DATABASE_URL: z.string().startsWith("postgresql://"),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32)
    .refine((value) => value !== "GENERATE_WITH_openssl_rand_base64_32"),
  BETTER_AUTH_URL: z.url(),
  MAIL_TRANSPORT: z.enum(["local", "resend"]).default("resend"),
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().optional(),
});
export function getConfig() {
  const result = schema.safeParse(process.env);
  if (!result.success)
    throw new Error(
      "Server configuration is missing or invalid. Check .env.example.",
    );
  return result.data;
}
