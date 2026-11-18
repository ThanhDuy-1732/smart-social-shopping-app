import Link from "next/link";
import { pageActor } from "@/server/page-access";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await pageActor();
  return (
    <>
      <nav className="subnav" aria-label="Quản trị">
        <Link href="/admin">Tổng quan</Link>
        <Link href="/admin/users">Người dùng</Link>
        <Link href="/admin/shops">Nhà bán</Link>
        <Link href="/admin/policies">Chính sách</Link>
        <Link href="/admin/categories">Danh mục</Link>
        <Link href="/admin/products">Sản phẩm</Link>
        <Link href="/admin/jobs">Tác vụ nền</Link><Link href="/admin/payments">Thanh toán</Link>
      </nav>
      {children}
    </>
  );
}
