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
          <Link href="/seller">Gian hàng</Link>
          <Link className="button secondary" href="/settings">
            Tài khoản
          </Link>
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
