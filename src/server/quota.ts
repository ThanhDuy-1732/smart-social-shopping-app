import { db } from "./db";
import { DomainError } from "@/modules/shared/types";

const bucketSql = (table: string, identityColumn: string) =>
  `INSERT INTO ${table}(${identityColumn},scope,count,expires_at) VALUES($1,$2,1,clock_timestamp()+make_interval(secs=>$4)) ON CONFLICT(${identityColumn},scope) DO UPDATE SET count=CASE WHEN ${table}.expires_at<=clock_timestamp() THEN 1 ELSE ${table}.count+1 END,expires_at=CASE WHEN ${table}.expires_at<=clock_timestamp() THEN clock_timestamp()+make_interval(secs=>$4) ELSE ${table}.expires_at END WHERE ${table}.count<$3 OR ${table}.expires_at<=clock_timestamp() RETURNING count`;

async function consume(
  table: string,
  identityColumn: string,
  identity: string,
  scope: "message" | "comment" | "upload" | "discovery" | "discovery-anon" | "activity",
  limit: number,
  seconds: number,
): Promise<void> {
  const row = await db.query(bucketSql(table, identityColumn), [
    identity,
    scope,
    limit,
    seconds,
  ]);
  if (!row.rowCount)
    throw new DomainError(
      "RATE_LIMITED",
      "Bạn đang thao tác quá nhanh. Vui lòng thử lại sau.",
    );
}

export function consumeQuota(
  userId: string,
  scope: "message" | "comment" | "upload" | "discovery" | "activity",
  limit: number,
  seconds: number,
): Promise<void> {
  return consume("quota_bucket", "user_id", userId, scope, limit, seconds);
}

// Anonymous spend gate keyed by request IP; identity has no user row, so it
// lives in its own table without the user foreign key.
export function consumeAnonQuota(
  identity: string,
  scope: "discovery-anon",
  limit: number,
  seconds: number,
): Promise<void> {
  return consume("anon_quota_bucket", "identity", identity, scope, limit, seconds);
}
