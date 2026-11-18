import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { mkdir, chmod } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
const localBin = resolve(
  ".local/pg-client-build/postgresql-18.0/src/bin/pg_dump",
);
const run = promisify(execFile);
function connection(databaseUrl: string) {
  const url = new URL(databaseUrl);
  return {
    ...process.env,
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    PGHOST: url.searchParams.get("host") ?? url.hostname,
    PGPORT: url.searchParams.get("port") ?? (url.port || "5432"),
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
  };
}
export async function backupDatabase(
  databaseUrl: string,
  file: string,
): Promise<void> {
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  const binary =
    process.env.PG_DUMP_PATH ??
    (existsSync(localBin + "/pg_dump") ? localBin + "/pg_dump" : "pg_dump");
  await run(
    binary,
    [
      "--format=custom",
      "--compress=0",
      "--no-owner",
      "--no-acl",
      "--file",
      file,
    ],
    { env: connection(databaseUrl), timeout: 60000, maxBuffer: 65536 },
  );
  await chmod(file, 0o600);
}
export async function restoreTestBackup(
  databaseUrl: string,
  file: string,
): Promise<void> {
  const env = connection(databaseUrl);
  if (!/^recovery_[a-f0-9]{32}_restore_test$/.test(env.PGDATABASE))
    throw new Error(
      "Automated restore requires an isolated recovery_*_restore_test database.",
    );
  const binary =
    process.env.PG_RESTORE_PATH ??
    (existsSync(localBin + "/pg_restore")
      ? localBin + "/pg_restore"
      : "pg_restore");
  await run(
    binary,
    [
      "--exit-on-error",
      "--no-owner",
      "--no-acl",
      "--dbname",
      env.PGDATABASE,
      file,
    ],
    { env, timeout: 60000, maxBuffer: 65536 },
  );
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve("scripts/backup.ts")
) {
  const file = `.local/backups/${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}.dump`;
  try {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");
    await backupDatabase(process.env.DATABASE_URL, file);
    console.log(`Backup created: ${file}`);
  } catch (error) {
    console.error(
      "Backup failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    process.exitCode = 1;
  }
}
