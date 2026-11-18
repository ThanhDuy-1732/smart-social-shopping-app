import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { SessionNav } from "@/components/session-nav";
export const metadata: Metadata = {
  title: {
    default: "Mình dùng — Khám phá từ trải nghiệm thật",
    template: "%s | Mình dùng",
  },
  description:
    "Chia sẻ trải nghiệm, tìm sản phẩm phù hợp và mua sắm cùng cộng đồng.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <a className="skip button" href="#content">
          Đến nội dung chính
        </a>
        <header className="site-header">
          <div className="header-inner">
            <Link className="brand" href="/">
              mình<b>dùng.</b>
            </Link>
            <nav className="main-nav" aria-label="Điều hướng chính">
              <Link href="/feed">Cộng đồng</Link>
              <Link href="/search">Mua sắm</Link>
              <Link href="/discover">Gợi ý cho bạn</Link>
            </nav>
            <SessionNav />
          </div>
        </header>
        <main id="content">{children}</main>
        <footer className="site-footer">
          <span>Mình dùng · Chọn từ trải nghiệm thật.</span>
          <span>
            <Link href="/seller">Dành cho nhà bán</Link> &nbsp;{" "}
            <Link href="/settings">Tài khoản</Link> &nbsp;{" "}
            <Link href="/terms">Chính sách</Link>
          </span>
        </footer>
      </body>
    </html>
  );
}
