import { pushConfigured } from "./push";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { enqueueJob } from "@/server/jobs";
import { db } from "@/server/db";
import { assertActiveActor } from "@/modules/access/service";
import { DomainError, type Actor } from "@/modules/shared/types";
export async function notifyUser(
  userId: string,
  input: { eventKey: string; title: string; href: string; email?: boolean },
  client: Pick<PoolClient, "query"> = db,
): Promise<void> {
  if (
    !input.href.startsWith("/") ||
    input.href.startsWith("//") ||
    input.href.includes("\\") ||
    input.title.length > 200
  )
    throw new DomainError("INVALID_INPUT", "Thông báo không hợp lệ.");
  const id = randomUUID();
  const result = await client.query(
    "INSERT INTO notification(id,user_id,event_key,title,href) VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id,event_key) DO NOTHING RETURNING id",
    [id, userId, input.eventKey, input.title, input.href],
  );
  if (result.rowCount && pushConfigured())
    await enqueueJob("push.send", id, { id }, client);
  if (result.rowCount && input.email) {
    await client.query(
      'INSERT INTO email_outbox(id,user_id,email,subject,body) SELECT $1,id,email,$3,$4 FROM "user" WHERE id=$2',
      [
        id,
        userId,
        input.title,
        `${input.title}\nMở ứng dụng để xem chi tiết: ${input.href}`,
      ],
    );
    await enqueueJob("email.send", id, { id }, client);
  }
}
export async function listNotifications(actor: Actor) {
  await assertActiveActor(actor);
  return (
    await db.query<{
      id: string;
      title: string;
      href: string;
      readAt: Date | null;
      createdAt: Date;
    }>(
      'SELECT id,title,href,read_at AS "readAt",created_at AS "createdAt" FROM notification WHERE user_id=$1 ORDER BY created_at DESC,id DESC LIMIT 100',
      [actor.userId],
    )
  ).rows;
}
export async function markNotificationRead(
  actor: Actor,
  id: string,
): Promise<void> {
  await assertActiveActor(actor);
  const result = await db.query(
    "UPDATE notification SET read_at=coalesce(read_at,now()) WHERE id=$1 AND user_id=$2 RETURNING id",
    [id, actor.userId],
  );
  if (!result.rowCount)
    throw new DomainError("NOT_FOUND", "Không tìm thấy thông báo.");
}
