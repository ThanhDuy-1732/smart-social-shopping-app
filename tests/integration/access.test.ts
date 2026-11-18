import { beforeAll, afterAll, expect, test } from 'vitest';
import { randomUUID } from 'node:crypto';
import { auth } from '@/server/auth';
import { db } from '@/server/db';
import { prepareDatabase } from '../fixtures/database';
import { requireActor, requirePermission } from '@/modules/access/service';
import { readdir, readFile } from 'node:fs/promises';
let userId: string;
let cookie: string;
beforeAll(async () => {
  await prepareDatabase();
  const email = `access-${randomUUID()}@example.test`;
  const result = await auth.api.signUpEmail({ body: { email, name: 'Người thử', password: 'A-secure-password-123!' } });
  userId = result.user.id;
  await db.query('UPDATE "user" SET "emailVerified"=true WHERE id=$1', [userId]);
  const response = await auth.api.signInEmail({ body: { email, password: 'A-secure-password-123!' }, asResponse: true });
  cookie = response.headers.getSetCookie().map(x => x.split(';')[0]).join('; ');
});
afterAll(async () => { if (userId) await db.query('DELETE FROM "user" WHERE id=$1', [userId]); await db.end(); });

test('authenticated session yields only the authenticated actor', async () => {
  expect(await requireActor(new Headers({ cookie }))).toEqual({ userId });
  await expect(requireActor(new Headers())).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
});
test('roles require MFA and revocation takes effect during an existing session', async () => {
  await db.query('INSERT INTO user_role(user_id,role) VALUES($1,$2)', [userId, 'moderator']);
  await expect(requirePermission({ userId }, 'content.moderate')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  await db.query('UPDATE "user" SET "twoFactorEnabled"=true WHERE id=$1', [userId]);
  await requirePermission({ userId }, 'content.moderate');
  await expect(requirePermission({ userId }, 'finance.manage')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  await db.query('DELETE FROM user_role WHERE user_id=$1', [userId]);
  await expect(requirePermission({ userId }, 'content.moderate')).rejects.toMatchObject({ code: 'FORBIDDEN' });
});
test('suspension prevents existing sessions from becoming actors', async () => {
  await db.query('INSERT INTO account_state(user_id,suspended) VALUES($1,true)', [userId]);
  await expect(requireActor(new Headers({ cookie }))).rejects.toMatchObject({ code: 'FORBIDDEN' });
  await db.query('DELETE FROM account_state WHERE user_id=$1', [userId]);
});
test('email verification is required and a real local verification link works', async () => {
  const email = `verify-${randomUUID()}@example.test`;
  const result = await auth.api.signUpEmail({ body: { email, name: 'Xác minh', password: 'A-secure-password-123!' } });
  try {
    const denied = await auth.api.signInEmail({ body: { email, password: 'A-secure-password-123!' }, asResponse: true });
    expect(denied.status).toBe(403);
    const messages = await Promise.all((await readdir('.local/mail')).map(async f => JSON.parse(await readFile(`.local/mail/${f}`, 'utf8'))));
    const message = messages.find(m => m.to === email && m.subject.includes('Xác minh'));
    expect(message).toBeDefined();
    const token = new URL(message.text.match(/https?:\/\/\S+/)[0]).searchParams.get('token')!;
    const verified = await auth.api.verifyEmail({ query: { token }, asResponse: true });
    expect(verified.status).toBeLessThan(400);
    expect((await db.query('SELECT "emailVerified" FROM "user" WHERE id=$1', [result.user.id])).rows[0].emailVerified).toBe(true);
  } finally { await db.query('DELETE FROM "user" WHERE id=$1', [result.user.id]); }
});
test('reset responses do not reveal whether an email exists', async () => {
  const existing = (await db.query('SELECT email FROM "user" WHERE id=$1', [userId])).rows[0].email;
  const a = await auth.api.requestPasswordReset({ body: { email: existing, redirectTo: '/reset-password' } });
  const b = await auth.api.requestPasswordReset({ body: { email: `none-${randomUUID()}@example.test`, redirectTo: '/reset-password' } });
  expect(a).toEqual(b);
});
test('migrations are idempotent on the test database', async () => {
  const { migrate } = await import('@/server/migrations');
  expect(await migrate()).toBe(0);
});

test('role changes and suspension are audited and restricted to MFA admins', async () => {
  const { setUserRole, suspendUser } = await import('@/modules/users/service');
  const email = `role-${randomUUID()}@example.test`;
  const target = (await auth.api.signUpEmail({ body: { email, name: 'Nhân sự', password: 'A-secure-password-123!' } })).user.id;
  try {
    await expect(setUserRole({ userId }, target, 'finance', true)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await db.query("INSERT INTO user_role(user_id,role) VALUES($1,'admin')", [userId]);
    await expect(setUserRole({ userId }, target, 'finance', true)).rejects.toMatchObject({ code: 'CONFLICT' });
    await db.query('UPDATE "user" SET "emailVerified"=true,"twoFactorEnabled"=true WHERE id=$1', [target]);
    await setUserRole({ userId }, target, 'finance', true);
    await requirePermission({ userId: target }, 'finance.manage');
    await expect(requirePermission({ userId: target }, 'users.manage')).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await suspendUser({ userId }, target, true);
    await expect(requirePermission({ userId: target }, 'finance.manage')).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect((await db.query('SELECT action FROM audit_event WHERE target_id=$1 ORDER BY created_at', [target])).rows.map(r => r.action)).toEqual(['user.role','user.suspension']);
    await expect(suspendUser({ userId }, userId, true)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  } finally { await db.query('DELETE FROM "user" WHERE id=$1', [target]); await db.query('DELETE FROM user_role WHERE user_id=$1', [userId]); }
});

test('expired reset links fail and logout invalidates the server session', async () => {
  const response = await auth.api.resetPassword({ body: { newPassword: 'A-new-secure-password-123!', token: 'expired-or-invalid-token' }, asResponse: true });
  expect(response.status).toBe(400);
  await auth.api.signOut({ headers: new Headers({ cookie }), asResponse: true });
  await expect(requireActor(new Headers({ cookie }))).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
});
