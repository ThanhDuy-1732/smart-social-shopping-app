import { getMigrations } from 'better-auth/db/migration';
import { writeFile } from 'node:fs/promises';
import { auth } from '../src/server/auth';
import { db } from '../src/server/db';
try {
  const plan = await getMigrations(auth.options);
  const sql = await plan.compileMigrations();
  await writeFile('db/migrations/001_auth.sql', '-- Generated from the pinned Better Auth configuration.\n' + sql + '\n', { flag: 'wx' });
} finally { await db.end(); }
