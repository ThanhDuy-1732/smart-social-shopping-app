import { randomUUID } from "node:crypto";
import { db, withTransaction } from "../src/server/db";
const email = process.argv[2];
try {
  if (!email || process.argv.length !== 3)
    throw new Error("Usage: npm run admin:grant -- owner@example.com");
  await withTransaction(async (client) => {
    const user = (
      await client.query(
        'SELECT id,"emailVerified","twoFactorEnabled" FROM "user" WHERE email=$1 FOR UPDATE',
        [email.toLowerCase()],
      )
    ).rows[0];
    if (!user?.emailVerified || !user?.twoFactorEnabled)
      throw new Error(
        "Account must exist, verify email and enable MFA before granting admin.",
      );
    await client.query(
      "INSERT INTO user_role(user_id,role) VALUES($1,'admin') ON CONFLICT DO NOTHING",
      [user.id],
    );
    await client.query(
      "INSERT INTO audit_event(id,action,target_id,details) VALUES($1,'user.bootstrap-admin',$2,$3)",
      [randomUUID(), user.id, JSON.stringify({ source: "operator-cli" })],
    );
  });
  console.log("Admin role granted to the verified MFA account.");
} finally {
  await db.end();
}
