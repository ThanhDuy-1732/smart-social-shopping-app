import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { db } from './db';
export async function migrate(): Promise<number> {
  const client = await db.connect();
  let count = 0;
  try {
    await client.query('SELECT pg_advisory_lock(1937193)');
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    const files = (await readdir('db/migrations')).filter(x => x.endsWith('.sql')).sort();
    for (const name of files) {
      const sql = await readFile(`db/migrations/${name}`, 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const prior = await client.query('SELECT checksum FROM schema_migrations WHERE name=$1', [name]);
      if (prior.rowCount) {
        if (prior.rows[0].checksum !== checksum) throw new Error(`Applied migration changed: ${name}`);
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)', [name, checksum]);
        await client.query('COMMIT'); count++;
      } catch (error) { await client.query('ROLLBACK'); throw error; }
    }
    return count;
  } finally { await client.query('SELECT pg_advisory_unlock(1937193)'); client.release(); }
}
