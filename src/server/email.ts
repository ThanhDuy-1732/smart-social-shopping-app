import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { getConfig } from "./config";
type Email = { to: string; subject: string; text: string };
export async function sendEmail(email: Email): Promise<void> {
  return deliverEmail(email, randomUUID());
}
export async function deliverEmail(email: Email, key: string): Promise<void> {
  const config = getConfig();
  if (config.MAIL_TRANSPORT === "local") {
    if (process.env.NODE_ENV === "production")
      throw new Error(
        "Local mail is not available in production. Configure Resend.",
      );
    await mkdir(".local/mail", { recursive: true, mode: 0o700 });
    await writeFile(`.local/mail/${key}.json`, JSON.stringify(email), {
      mode: 0o600,
    });
    return;
  }
  if (!config.RESEND_API_KEY || !config.MAIL_FROM)
    throw new Error("Email provider is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": key,
    },
    body: JSON.stringify({ from: config.MAIL_FROM, ...email }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Email delivery failed.");
}
