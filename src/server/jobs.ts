import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { db, withTransaction } from "./db";
export type Job = {
  id: string;
  kind: string;
  key: string;
  payload: unknown;
  attempts: number;
  leaseToken: string;
};
export async function enqueueJob(
  kind: string,
  key: string,
  payload: unknown,
  client: Pick<PoolClient, "query"> = db,
): Promise<void> {
  await client.query(
    "INSERT INTO background_job(id,kind,key,payload) VALUES($1,$2,$3,$4) ON CONFLICT(kind,key) DO NOTHING",
    [randomUUID(), kind, key, JSON.stringify(payload)],
  );
}
export async function claimJob(kind: string): Promise<Job | null> {
  return withTransaction(async (client) => {
    await client.query(
      "UPDATE background_job SET status='failed',last_error='RetryLimit' WHERE kind=$1 AND status='working' AND lease_until<now() AND attempts>=3",
      [kind],
    );
    const result = await client.query<Job>(
      "WITH due AS (SELECT id FROM background_job WHERE kind=$1 AND attempts<3 AND ((status='pending' AND available_at<=now()) OR (status='working' AND lease_until<now())) ORDER BY available_at,id FOR UPDATE SKIP LOCKED LIMIT 1) UPDATE background_job j SET status='working',attempts=attempts+1,lease_until=now()+interval '60 seconds',lease_token=$2 FROM due WHERE j.id=due.id RETURNING j.id,j.kind,j.key,j.payload,j.attempts,j.lease_token AS \"leaseToken\"",
      [kind, randomUUID()],
    );
    return result.rows[0] ?? null;
  });
}
export async function completeJob(
  id: string,
  leaseToken: string,
): Promise<boolean> {
  return Boolean(
    (
      await db.query(
        "UPDATE background_job SET status='done',lease_until=null WHERE id=$1 AND lease_token=$2 AND status='working'",
        [id, leaseToken],
      )
    ).rowCount,
  );
}
export async function failJob(job: Job, error: unknown): Promise<void> {
  await db.query(
    "UPDATE background_job SET status=CASE WHEN attempts>=3 THEN 'failed' ELSE 'pending' END,available_at=now()+interval '5 seconds'*attempts,lease_until=null,last_error=$3 WHERE id=$1 AND lease_token=$2 AND status='working'",
    [
      job.id,
      job.leaseToken,
      error instanceof Error ? error.name : "UnknownError",
    ],
  );
}
