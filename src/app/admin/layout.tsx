import { PrivateSession } from "@/components/private-session";
import Link from "next/link";
import { pageActor } from "@/server/page-access";
import { getAllowedPermissions } from "@/modules/access/service";
import { adminNavigation } from "@/modules/access/admin-navigation";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await pageActor();
  const allowed = await getAllowedPermissions(actor);
  const items = adminNavigation.filter((item) =>
    allowed.includes(item.permission),
  );
  return (
    <PrivateSession
      key={actor.userId}
      userId={actor.userId}
      permissions={allowed}
    >
      <nav className="subnav workspace-nav" aria-label="Quản trị">
        <Link href="/admin">Tổng quan</Link>
        {items
          .filter(
            (item, index) =>
              items.findIndex((x) => x.href === item.href) === index,
          )
          .map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
      </nav>
      {children}
    </PrivateSession>
  );
}
