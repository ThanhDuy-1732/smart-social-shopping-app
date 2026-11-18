import { ProfileForm } from "@/components/profile-form";
import { getPublicProfile } from "@/modules/social/queries";
import { listBlockedUsers } from "@/modules/social/service";
import { ActionForm } from "@/components/action-form";
import { socialAction } from "@/app/(public)/feed/actions";
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
  const actor = await pageActor();
  const profile = await getPublicProfile(actor, actor.userId);
  const blocked = await listBlockedUsers(actor);
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
      <div className="two-col">
        <div className="panel">
          <h2>Hồ sơ công khai</h2>
          <ProfileForm
            name={profile?.name ?? ""}
            bio={profile?.bio ?? ""}
            avatarId={profile?.avatarId ?? null}
          />
        </div>
        <div style={{ maxWidth: 560 }}>
          <AccountSettings
            twoFactorEnabled={session?.user.twoFactorEnabled ?? false}
          />
        </div>
      </div>
      <section className="panel section">
        <h2>Tài khoản đã chặn</h2>
        {blocked.length ? (
          blocked.map((u) => (
            <div className="row section" key={u.id}>
              <span>{u.name}</span>
              <ActionForm action={socialAction} submitLabel="Bỏ chặn">
                <input type="hidden" name="type" value="block" />
                <input type="hidden" name="targetId" value={u.id} />
                <input type="hidden" name="enabled" value="false" />
              </ActionForm>
            </div>
          ))
        ) : (
          <p className="muted">Bạn chưa chặn tài khoản nào.</p>
        )}
      </section>
    </>
  );
}
