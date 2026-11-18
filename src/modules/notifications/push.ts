import { z } from "zod";
import webpush from "web-push";
import { db } from "@/server/db";
import { claimJob, completeJob, failJob } from "@/server/jobs";
import { assertActiveActor } from "@/modules/access/service";
import { DomainError, type Actor } from "@/modules/shared/types";
export function pushConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT,
  );
}
const subscriptionSchema = z.object({
  endpoint: z
    .url()
    .max(2000)
    .refine((value) => {
      const u = new URL(value);
      return (
        u.protocol === "https:" &&
        !u.username &&
        !u.password &&
        !u.port &&
        (u.hostname === "fcm.googleapis.com" ||
          u.hostname === "updates.push.services.mozilla.com" ||
          u.hostname === "web.push.apple.com" ||
          u.hostname.endsWith(".notify.windows.com"))
      );
    }),
  keys: z.object({
    p256dh: z
      .string()
      .regex(/^[A-Za-z0-9_-]+$/)
      .refine((s) => {
        const b = Buffer.from(s, "base64url");
        return b.length === 65 && b[0] === 4;
      }),
    auth: z
      .string()
      .regex(/^[A-Za-z0-9_-]+$/)
      .refine((s) => Buffer.from(s, "base64url").length === 16),
  }),
});
export async function subscribePush(
  actor: Actor,
  input: unknown,
  sessionId: string,
): Promise<void> {
  await assertActiveActor(actor);
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success)
    throw new DomainError("INVALID_INPUT", "Đăng ký thông báo chưa hợp lệ.");
  if (!pushConfigured())
    throw new DomainError(
      "PROVIDER_UNAVAILABLE",
      "Thông báo đẩy chưa được cấu hình.",
    );
  if (
    !(
      await db.query(
        'SELECT 1 FROM session WHERE id=$1 AND "userId"=$2 AND "expiresAt">now()',
        [sessionId, actor.userId],
      )
    ).rowCount
  )
    throw new DomainError("UNAUTHENTICATED", "Vui lòng đăng nhập lại.");
  const v = parsed.data;
  await db.query(
    "INSERT INTO push_subscription(endpoint,user_id,session_id,keys) VALUES($1,$2,$3,$4) ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id,session_id=excluded.session_id,keys=excluded.keys",
    [v.endpoint, actor.userId, sessionId, JSON.stringify(v.keys)],
  );
}
export async function unsubscribePush(
  actor: Actor,
  endpoint: string,
): Promise<void> {
  await assertActiveActor(actor);
  await db.query(
    "DELETE FROM push_subscription WHERE endpoint=$1 AND user_id=$2",
    [endpoint, actor.userId],
  );
}
export async function workPushOnce(): Promise<boolean> {
  if (!pushConfigured()) return false;
  const job = await claimJob("push.send");
  if (!job) return false;
  try {
    const { id } = z.object({ id: z.uuid() }).parse(job.payload);
    const subscriptions = (
      await db.query<{
        endpoint: string;
        keys: { p256dh: string; auth: string };
      }>(
        "SELECT p.endpoint,p.keys FROM notification n JOIN push_subscription p ON p.user_id=n.user_id JOIN session s ON s.id=p.session_id WHERE n.id=$1 AND n.read_at IS NULL AND n.created_at>now()-interval '1 hour' AND s.\"expiresAt\">now() AND NOT EXISTS(SELECT 1 FROM account_state a WHERE a.user_id=n.user_id AND a.suspended=true) LIMIT 10",
        [id],
      )
    ).rows;
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );
    for (const subscription of subscriptions) {
      const parsed = subscriptionSchema.safeParse(subscription);
      if (!parsed.success) continue;
      try {
        await webpush.sendNotification(
          parsed.data,
          JSON.stringify({ type: "update" }),
          { TTL: 300, timeout: 10000 },
        );
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410)
          await db.query("DELETE FROM push_subscription WHERE endpoint=$1", [
            subscription.endpoint,
          ]);
        else throw e;
      }
    }
    await completeJob(job.id, job.leaseToken);
  } catch (e) {
    await failJob(job, e);
  }
  return true;
}
