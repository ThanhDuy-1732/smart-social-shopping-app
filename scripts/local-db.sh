#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
project_root=$(pwd -P)
pg_bin=${PG_BIN_DIR:-}
if [ -z "$pg_bin" ] && [ -x .local/postgres-bin/package/native/bin/initdb ]; then
  pg_bin="$project_root/.local/postgres-bin/package/native/bin/"
fi
if [ -n "$pg_bin" ]; then pg_bin="${pg_bin%/}/"; fi
mkdir -p .local/pgsocket
chmod 700 .local .local/pgsocket
if [ ! -f .local/pgdata/PG_VERSION ]; then
  "${pg_bin}initdb" -D .local/pgdata -A trust -U shopping --no-locale --encoding=UTF8 > .local/initdb.log
fi
if ! "${pg_bin}pg_ctl" -D .local/pgdata status >/dev/null 2>&1; then
  "${pg_bin}pg_ctl" -D .local/pgdata -l .local/postgres.log -o "-k '$project_root/.local/pgsocket' -h '' -p 55439" start
fi
node --input-type=module <<'NODE'
import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import pg from 'pg';
const socketPath = `${process.cwd()}/.local/pgsocket`;
const client = new pg.Client({ host: socketPath, port: 55439, user: 'shopping', database: 'postgres' });
await client.connect();
try {
  for (const database of ['shopping', 'shopping_test']) {
    if (!(await client.query('SELECT 1 FROM pg_database WHERE datname=$1', [database])).rowCount) {
      await client.query(`CREATE DATABASE ${database}`);
    }
  }
} finally { await client.end(); }
const socket = encodeURIComponent(socketPath);
for (const [file, database] of [['.env.local', 'shopping'], ['.env.test', 'shopping_test']]) {
  if (!existsSync(file)) writeFileSync(file, `DATABASE_URL=postgresql://shopping@localhost:55439/${database}?host=${socket}\nBETTER_AUTH_SECRET=${randomBytes(32).toString('base64url')}\nBETTER_AUTH_URL=http://127.0.0.1:14388\nMAIL_TRANSPORT=local\n`, { mode: 0o600 });
}
NODE
