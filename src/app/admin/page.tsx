import Link from "next/link";
import { redirect } from "next/navigation";
import { pageActor } from "@/server/page-access";
import { getAllowedPermissions } from "@/modules/access/service";
import { adminNavigation } from "@/modules/access/admin-navigation";
export default async function Admin() {
  const actor = await pageActor();
  const allowed = await getAllowedPermissions(actor);
  if (!allowed.length) redirect("/settings?access=denied");
  const items = adminNavigation.filter((item) =>
    allowed.includes(item.permission),
  );
  return (
    <>
      <h1>Khu vận hành</h1>
      <p className="muted">Các chức năng được mở theo quyền của tài khoản.</p>
      <div className="grid">
        {items
          .filter(
            (item, index) =>
              items.findIndex((x) => x.href === item.href) === index,
          )
          .map((item) => (
            <Link className="panel" href={item.href} key={item.href}>
              <h2>{item.label}</h2>
              <p>Xem và xử lý {item.label.toLowerCase()}.</p>
            </Link>
          ))}
      </div>
    </>
  );
}
