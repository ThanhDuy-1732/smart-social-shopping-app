import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/server/auth";
import { pageActor } from "@/server/page-access";
import { AccountSettings } from "@/components/account-settings";
export default async function Settings({
  searchParams,
}: {
  searchParams: Promise<{ access?: string }>;
}) {
  await pageActor();
  const session = await auth.api.getSession({ headers: await headers() });
  const query = await searchParams;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Tài khoản của bạn</h1>
          <p className="muted">
            {session?.user.name} · {session?.user.email}
          </p>
        </div>
        <div className="row">
          <Link className="button secondary" href="/seller">
            Gian hàng của tôi
          </Link>
          <Link className="button secondary" href="/admin">
            Khu quản trị
          </Link>
        </div>
      </div>
      {query.access === "denied" && (
        <p className="notice error" role="alert">
          Tài khoản không có quyền truy cập hoặc đang bị hạn chế. Với tài khoản
          vận hành, hãy bật xác thực hai bước trước khi được cấp quyền.
        </p>
      )}
      <div style={{ maxWidth: 560 }}>
        <AccountSettings
          twoFactorEnabled={session?.user.twoFactorEnabled ?? false}
        />
      </div>
    </>
  );
}
