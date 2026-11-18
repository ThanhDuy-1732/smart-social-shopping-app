import Link from "next/link";
import { pageActor } from "@/server/page-access";
export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await pageActor();
  return (
    <>
      <nav className="subnav" aria-label="Gian hàng">
        <Link href="/seller">Tổng quan</Link>
        <Link href="/seller/products">Sản phẩm</Link>
        <Link href="/seller/orders">Đơn hàng</Link>
        <Link href="/seller/shipping">Giao hàng</Link>
        <Link href="/seller/finance">Đối soát</Link>
      </nav>
      {children}
    </>
  );
}
