import { betterAuth } from 'better-auth';
import { twoFactor } from 'better-auth/plugins';
import { randomUUID } from 'node:crypto';
import { db } from './db';
import { getConfig } from './config';
import { sendEmail } from './email';
const config = getConfig();
export const auth = betterAuth({
  database: db,
  secret: config.BETTER_AUTH_SECRET,
  baseURL: config.BETTER_AUTH_URL,
  trustedOrigins: [new URL(config.BETTER_AUTH_URL).origin],
  appName: 'Mình dùng',
  emailAndPassword: {
    enabled: true, requireEmailVerification: true, minPasswordLength: 12, maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    async sendResetPassword({ user, url }) { await sendEmail({ to: user.email, subject: 'Đặt lại mật khẩu Mình dùng', text: `Mở liên kết để đặt mật khẩu mới: ${url}` }); },
  },
  emailVerification: {
    sendOnSignUp: true, sendOnSignIn: true, autoSignInAfterVerification: false,
    async sendVerificationEmail({ user, url }) { await sendEmail({ to: user.email, subject: 'Xác minh email Mình dùng', text: `Xác minh email của bạn: ${url}` }); },
  },
  session: { cookieCache: { enabled: false }, expiresIn: 60 * 60 * 24 * 7 },
  rateLimit: { enabled: true, storage: 'database', window: 60, max: 30 },
  advanced: { database: { generateId: () => randomUUID() } },
  databaseHooks: { user: { update: { before: async (user, context) => {
    if (user.twoFactorEnabled === true && context?.context.session?.user.id) {
      await db.query('DELETE FROM session WHERE \"userId\"=$1', [context.context.session.user.id]);
    }
  } } } },
  plugins: [twoFactor({ issuer: 'Mình dùng' })],
});
