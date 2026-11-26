import type { Metadata } from "next";
import "./preview.css";

export const metadata: Metadata = {
  title: "Xem trước giao diện",
  description: "Ba hướng bố cục cho bảng tin và trang tìm món.",
  robots: { index: false, follow: false },
};

export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
