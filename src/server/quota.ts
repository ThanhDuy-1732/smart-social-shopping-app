import { db } from "./db";
import { DomainError } from "@/modules/shared/types";
export async function consumeQuota(
  userId: string,
  scope: "message" | "comment" | "upload" | "discovery",
  limit: number,
  seconds: number,
): Promise<void> {
  const row = await db.query(
    "INSERT INTO quota_bucket(user_id,scope,count,expires_at) VALUES($1,$2,1,clock_timestamp()+make_interval(secs=>$4)) ON CONFLICT(user_id,scope) DO UPDATE SET count=CASE WHEN quota_bucket.expires_at<=clock_timestamp() THEN 1 ELSE quota_bucket.count+1 END,expires_at=CASE WHEN quota_bucket.expires_at<=clock_timestamp() THEN clock_timestamp()+make_interval(secs=>$4) ELSE quota_bucket.expires_at END WHERE quota_bucket.count<$3 OR quota_bucket.expires_at<=clock_timestamp() RETURNING count",
    [userId, scope, limit, seconds],
  );
  if (!row.rowCount)
    throw new DomainError(
      "RATE_LIMITED",
      "Bạn đang thao tác quá nhanh. Vui lòng thử lại sau.",
    );
}
