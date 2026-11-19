"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Trang chủ", icon: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" },
  {
    href: "/feed",
    label: "Cộng đồng",
    icon: "M20 11.5a8 8 0 0 1-8 8H5l1.5-3A8 8 0 1 1 20 11.5zM8.5 11.5h.1m3.4 0h.1m3.4 0h.1",
  },
  {
    href: "/search",
    label: "Mua sắm",
    icon: "M5 8h14l2 13H3L5 8zM9 9V6a3 3 0 0 1 6 0v3",
  },
  {
    href: "/discover",
    label: "Gợi ý",
    icon: "M12 2c0 6-4 10-10 10 6 0 10 4 10 10 0-6 4-10 10-10-6 0-10-4-10-10z",
  },
];

export function SiteNavigation() {
  const pathname = usePathname();
  return (
    <nav className="main-nav" aria-label="Điều hướng chính">
      {links.map(({ href, label, icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? "page" : undefined}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={icon} />
          </svg>
          {label}
        </Link>
      ))}
    </nav>
  );
}
