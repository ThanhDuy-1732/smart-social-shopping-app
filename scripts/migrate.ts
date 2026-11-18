import { migrate } from "../src/server/migrations";
import { db } from "../src/server/db";
try {
  console.log(`Applied ${await migrate()} migration(s).`);
} finally {
  await db.end();
}
