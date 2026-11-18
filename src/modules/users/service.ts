import type { PoolClient } from "pg";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db, withTransaction } from "@/server/db";
import { requirePermission } from "@/modules/access/service";
import { DomainError, type Actor } from "@/modules/shared/types";
const roles = z.enum(["admin", "moderator", "support", "finance"]);
export async function setUserRole(
  actor: Actor,
  userId: string,
  role: string,
  enabled: boolean,
) {
  await requirePermission(actor, "users.manage");
  const parsed = roles.safeParse(role);
  if (!parsed.success)
    throw new DomainError("INVALID_INPUT", "Quyền không hợp lệ.");
  if (userId === actor.userId)
    throw new DomainError(
      "FORBIDDEN",
      "Không tự thay đổi quyền quản trị của mình.",
    );
  await withTransaction(async (client) => {
    const target = await client.query(
      'SELECT "emailVerified","twoFactorEnabled" FROM "user" WHERE id=$1 FOR UPDATE',
      [userId],
    );
    if (!target.rowCount)
      throw new DomainError("NOT_FOUND", "Không tìm thấy tài khoản.");
    if (
      enabled &&
      (!target.rows[0].emailVerified || !target.rows[0].twoFactorEnabled)
    )
      throw new DomainError(
        "CONFLICT",
        "Tài khoản cần xác minh email và bật xác thực hai bước trước khi nhận quyền.",
      );
    if (enabled)
      await client.query(
        "INSERT INTO user_role(user_id,role) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [userId, role],
      );
    else
      await client.query("DELETE FROM user_role WHERE user_id=$1 AND role=$2", [
        userId,
        role,
      ]);
    await client.query(
      "INSERT INTO audit_event(id,actor_id,action,target_id,details) VALUES($1,$2,$3,$4,$5)",
      [
        randomUUID(),
        actor.userId,
        "user.role",
        userId,
        JSON.stringify({ role, enabled }),
      ],
    );
  });
}
export async function setUserSuspension(
  client: PoolClient,
  actor: Actor,
  userId: string,
  suspended: boolean,
) {
  if (userId === actor.userId)
    throw new DomainError(
      "FORBIDDEN",
      "Không tự khóa tài khoản quản trị của mình.",
    );
  const user = await client.query(
    'SELECT id FROM "user" WHERE id=$1 FOR UPDATE',
    [userId],
  );
  if (!user.rowCount)
    throw new DomainError("NOT_FOUND", "Không tìm thấy tài khoản.");
  await client.query(
    "INSERT INTO account_state(user_id,suspended) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET suspended=$2",
    [userId, suspended],
  );
  if (suspended) {
    await client.query('DELETE FROM session WHERE "userId"=$1', [userId]);
    await client.query(
      "UPDATE shop SET suspended_from=status,status='suspended' WHERE owner_user_id=$1 AND status='approved'",
      [userId],
    );
  }
  await client.query(
    "INSERT INTO audit_event(id,actor_id,action,target_id,details) VALUES($1,$2,'user.suspension',$3,$4)",
    [randomUUID(), actor.userId, userId, JSON.stringify({ suspended })],
  );
}
export async function suspendUser(
  actor: Actor,
  userId: string,
  suspended: boolean,
) {
  await requirePermission(actor, "users.manage");
  await withTransaction((client) =>
    setUserSuspension(client, actor, userId, suspended),
  );
}
export async function listUsers(actor: Actor) {
  await requirePermission(actor, "users.manage");
  return (
    await db.query(
      'SELECT u.id,u.name,u.email,u."emailVerified",u."twoFactorEnabled",coalesce(s.suspended,false) AS suspended,coalesce(array_agg(r.role) FILTER(WHERE r.role IS NOT NULL),\'{}\') AS roles FROM "user" u LEFT JOIN account_state s ON s.user_id=u.id LEFT JOIN user_role r ON r.user_id=u.id GROUP BY u.id,s.suspended ORDER BY u."createdAt" DESC LIMIT 100',
    )
  ).rows;
}
