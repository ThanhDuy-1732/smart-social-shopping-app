"use client";
import Link from "next/link";
import { authClient } from "./auth-client";
export function SessionNav() {
  const { data, isPending } = authClient.useSession();
  if (isPending)
    return (
      <div className="header-actions">
        <span className="muted" aria-live="polite">
          Đang tải…
        </span>
      </div>
    );
  return (
    <div className="header-actions">
      {data ? (
        <>
          <Link className="desktop-account-link" href="/messages">
            Tin nhắn
          </Link>
          <Link className="desktop-account-link" href="/notifications">
            Thông báo
          </Link>
          <Link href="/cart">Giỏ hàng</Link>
          <details className="account-menu">
            <summary>Tài khoản</summary>
            <nav
              aria-label="Tài khoản"
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("a"))
                  event.currentTarget
                    .closest("details")
                    ?.removeAttribute("open");
              }}
            >
              <Link href="/settings">Cài đặt tài khoản</Link>
              <Link href="/messages">Tin nhắn</Link>
              <Link href="/notifications">Thông báo</Link>
              <Link href="/orders">Đơn mua</Link>
              <Link href="/seller">Gian hàng</Link>
            </nav>
          </details>
        </>
      ) : (
        <>
          <Link href="/login">Đăng nhập</Link>
          <Link href="/register" className="button">
            Tham gia
          </Link>
        </>
      )}
    </div>
  );
}
