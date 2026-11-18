import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { DomainError, type Actor } from "@/modules/shared/types";
const permissions: Record<string, string[]> = {
  "users.manage": ["admin"],
  "catalog.manage": ["admin"],
  "shops.review": ["admin"],
  "policies.manage": ["admin"],
  "content.moderate": ["admin", "moderator"],
  "finance.manage": ["admin", "finance"],
  "reports.platform": ["admin", "finance"],
  "disputes.manage": ["admin", "support"],
};
export async function assertActiveActor(actor: Actor): Promise<void> {
  const { rows } = await db.query(
    'SELECT u."emailVerified",coalesce(s.suspended,false) AS suspended FROM "user" u LEFT JOIN account_state s ON s.user_id=u.id WHERE u.id=$1',
    [actor.userId],
  );
  if (!rows[0]) throw new DomainError("UNAUTHENTICATED", "Vui lòng đăng nhập.");
  if (rows[0].suspended || !rows[0].emailVerified)
    throw new DomainError(
      "FORBIDDEN",
      "Tài khoản chưa được xác minh hoặc đang bị tạm khóa.",
    );
}
export async function requireActor(headers: Headers): Promise<Actor> {
  const session = await auth.api.getSession({
    headers,
    query: { disableCookieCache: true },
  });
  if (!session) throw new DomainError("UNAUTHENTICATED", "Vui lòng đăng nhập.");
  const actor = { userId: session.user.id };
  await assertActiveActor(actor);
  return actor;
}
export async function getAllowedPermissions(actor: Actor): Promise<string[]> {
  await assertActiveActor(actor);
  const roles = (
    await db.query<{ role: string }>(
      'SELECT r.role FROM user_role r JOIN "user" u ON u.id=r.user_id WHERE r.user_id=$1 AND u."twoFactorEnabled"=true',
      [actor.userId],
    )
  ).rows.map((x) => x.role);
  return Object.entries(permissions)
    .filter(([, allowed]) => allowed.some((role) => roles.includes(role)))
    .map(([key]) => key);
}
export async function requirePermission(
  actor: Actor,
  permission: string,
  _shopId?: string,
): Promise<void> {
  if (!(await getAllowedPermissions(actor)).includes(permission))
    throw new DomainError(
      "FORBIDDEN",
      "Thao tác này yêu cầu đúng quyền và xác thực hai bước.",
    );
}
