import type { PoolClient } from "pg";
export async function lockShopFinance(
  client: PoolClient,
  shopId: string,
): Promise<void> {
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtextextended($1,1937196))",
    [shopId],
  );
}
