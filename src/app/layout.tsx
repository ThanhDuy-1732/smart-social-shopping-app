import { PwaControls } from "@/components/pwa-controls";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { SessionNav } from "@/components/session-nav";
import { SiteNavigation } from "@/components/site-navigation";

export const viewport: Viewport = { themeColor: "#fff1eb" };
export const metadata: Metadata = {
  icons: {
    icon: { url: "/brand/app-icon-32.png", sizes: "32x32", type: "image/png" },
    apple: {
      url: "/brand/app-icon-180.png",
      sizes: "180x180",
      type: "image/png",
    },
  },
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
            <SiteNavigation />
            <SessionNav />
          </div>
        </header>
        <main id="content">{children}</main>
        <div className="site-install">
          <PwaControls />
        </div>
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
