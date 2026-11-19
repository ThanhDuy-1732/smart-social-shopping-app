import { PrivateSession } from "@/components/private-session";
import Link from "next/link";
import { pageActor } from "@/server/page-access";
export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await pageActor();
  return (
    <PrivateSession key={actor.userId} userId={actor.userId}>
      <nav className="subnav workspace-nav" aria-label="Gian hàng">
        <Link href="/seller">Tổng quan</Link>
        <Link href="/seller/products">Sản phẩm</Link>
        <Link href="/seller/orders">Đơn hàng</Link>
        <Link href="/seller/shipping">Giao hàng</Link>
        <Link href="/seller/finance">Đối soát</Link>
        <Link href="/seller/reports">Báo cáo</Link>
      </nav>
      {children}
    </PrivateSession>
  );
}
