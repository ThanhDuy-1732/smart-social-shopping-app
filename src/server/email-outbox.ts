import { z } from "zod";
import { db } from "./db";
import { claimJob, completeJob, failJob } from "./jobs";
import { deliverEmail } from "./email";
export async function workEmailOnce(): Promise<boolean> {
  const job = await claimJob("email.send");
  if (!job) return false;
  try {
    const { id } = z.object({ id: z.uuid() }).parse(job.payload);
    const row = (
      await db.query(
        "SELECT *,attempted_at < now()-interval '23 hours' AS stale FROM email_outbox WHERE id=$1",
        [id],
      )
    ).rows[0];
    if (row?.status === "pending") {
      if (row.stale) {
        await db.query(
          "UPDATE email_outbox SET status='needs_review' WHERE id=$1",
          [id],
        );
      } else {
        await db.query(
          "UPDATE email_outbox SET attempted_at=coalesce(attempted_at,now()) WHERE id=$1",
          [id],
        );
        await deliverEmail(
          { to: row.email, subject: row.subject, text: row.body },
          id,
        );
        await db.query("UPDATE email_outbox SET status='sent' WHERE id=$1", [
          id,
        ]);
      }
    }
    await completeJob(job.id, job.leaseToken);
  } catch (error) {
    await failJob(job, error);
  }
  return true;
}
