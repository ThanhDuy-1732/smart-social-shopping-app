import Link from "next/link";
import { pageActor } from "@/server/page-access";
import {
  listNotifications,
  markNotificationRead,
} from "@/modules/notifications/service";
import { revalidatePath } from "next/cache";
async function read(data: FormData) {
  "use server";
  await markNotificationRead(await pageActor(), String(data.get("id")));
  revalidatePath("/notifications");
}
export default async function Notifications() {
  const items = await listNotifications(await pageActor());
  return (
    <section className="section">
      <h1>Thông báo</h1>
      {items.length ? (
        items.map((n) => (
          <article className="card" key={n.id}>
            <Link href={n.href}>{n.title}</Link>
            <p className="hint">{n.createdAt.toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"})}</p>
            {!n.readAt && (
              <form action={read}>
                <input type="hidden" name="id" value={n.id} />
                <button className="secondary">Đánh dấu đã đọc</button>
              </form>
            )}
          </article>
        ))
      ) : (
        <p>Chưa có thông báo.</p>
      )}
    </section>
  );
}
