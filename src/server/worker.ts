import { workPushOnce } from "@/modules/notifications/push";
import { refreshEligibleBalances } from "@/modules/finance/service";
import { releaseExpiredReservations } from "@/modules/checkout/service";
import { setTimeout } from "node:timers/promises";
import { workMediaOnce, cleanupExpiredUploads } from "@/modules/media/service";
import { workEmailOnce } from "./email-outbox";
import { db } from "./db";
let stopping = false;
let lastCleanup = 0;
process.on("SIGTERM", () => {
  stopping = true;
});
process.on("SIGINT", () => {
  stopping = true;
});
try {
  while (!stopping) {
    try {
      if (Date.now() - lastCleanup > 60000) {
        await cleanupExpiredUploads();
        await releaseExpiredReservations();
        await refreshEligibleBalances();
        lastCleanup = Date.now();
      }
      const mediaWorked = await workMediaOnce();
      const emailWorked = await workEmailOnce();
      const pushWorked = await workPushOnce();
      if (!mediaWorked && !emailWorked && !pushWorked) await setTimeout(1000);
    } catch (error) {
      console.error("Worker failed", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
      await setTimeout(2000);
    }
  }
} finally {
  await db.end();
}
