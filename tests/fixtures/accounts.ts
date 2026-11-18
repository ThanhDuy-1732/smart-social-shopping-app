import { randomUUID } from "node:crypto";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import type { Actor } from "@/modules/shared/types";
export async function createAccount(
  role?: "admin" | "moderator" | "support" | "finance",
): Promise<Actor> {
  const result = await auth.api.signUpEmail({
    body: {
      email: `fixture-${randomUUID()}@example.test`,
      name: "Tài khoản thử",
      password: "A-secure-password-123!",
    },
  });
  await db.query(
    'UPDATE "user" SET "emailVerified"=true,"twoFactorEnabled"=$2 WHERE id=$1',
    [result.user.id, Boolean(role)],
  );
  if (role)
    await db.query("INSERT INTO user_role(user_id,role) VALUES($1,$2)", [
      result.user.id,
      role,
    ]);
  return { userId: result.user.id };
}
