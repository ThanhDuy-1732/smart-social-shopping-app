import Link from "next/link";
import { optionalActor } from "@/server/optional-actor";
import { listFeed } from "@/modules/social/queries";
import { DomainError } from "@/modules/shared/types";
import { PostCard } from "@/components/post-card";
export const dynamic = "force-dynamic";
export default async function Feed({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; q?: string; cursor?: string }>;
}) {
  const actor = await optionalActor(),
    q = await searchParams;
  let result, error;
  try {
    result = await listFeed(actor, {
      mode: q.mode ?? "explore",
      query: q.q,
      cursor: q.cursor,
    });
  } catch (e) {
    if (!(e instanceof DomainError)) throw e;
    error = e.message;
  }
  const next = new URLSearchParams({
    mode: q.mode ?? "explore",
    ...(q.q ? { q: q.q } : {}),
  });
  if (result?.nextCursor) next.set("cursor", result.nextCursor);
  return (
    <>
      <div className="section-intro">
        <div className="page-heading">
          <div>
            <h1>Cộng đồng mình dùng</h1>
            <p className="muted">
              Một trải nghiệm thật, thêm một góc nhìn khi chọn mua.
            </p>
          </div>
          <Link className="button" href={actor ? "/posts/new" : "/login"}>
            Chia sẻ trải nghiệm
          </Link>
        </div>
      </div>
      <nav className="subnav" aria-label="Bảng tin">
        <Link
          href="/feed"
          aria-current={!q.mode || q.mode === "explore" ? "page" : undefined}
        >
          Khám phá
        </Link>
        <Link
          href="/feed?mode=following"
          aria-current={q.mode === "following" ? "page" : undefined}
        >
          Đang theo dõi
        </Link>
        <Link
          href="/feed?mode=saved"
          aria-current={q.mode === "saved" ? "page" : undefined}
        >
          Đã lưu
        </Link>
      </nav>
      <div className="social-layout">
        <section>
          <form action="/feed" className="row search-bar">
            {q.mode && <input type="hidden" name="mode" value={q.mode} />}
            <input
              aria-label="Tìm bài chia sẻ"
              name="q"
              defaultValue={q.q}
              placeholder="Tìm trải nghiệm, chủ đề…"
              maxLength={300}
            />
            <button>Tìm bài</button>
          </form>
          {error ? (
            <p className="notice error" role="alert">
              {error}
            </p>
          ) : result?.items.length ? (
            result.items.map((post) => (
              <PostCard key={post.id} post={post} signedIn={Boolean(actor)} />
            ))
          ) : (
            <div className="panel empty">
              <h2>Những câu chuyện đang chờ bạn</h2>
              <p className="muted">
                Chia sẻ món bạn đang dùng hoặc theo dõi người có cùng sở thích.
              </p>
              <Link
                href={actor ? "/posts/new" : "/register"}
                className="button"
              >
                Viết bài đầu tiên
              </Link>
            </div>
          )}
          {result?.nextCursor && (
            <Link className="button secondary" href={`/feed?${next}`}>
              Xem thêm bài
            </Link>
          )}
        </section>
        <aside className="panel social-aside">
          <h2>Bạn đang cần gì?</h2>
          <p className="muted">
            Tìm sản phẩm theo nhu cầu, rồi đọc thêm trải nghiệm từ cộng đồng.
          </p>
          <Link className="button secondary" href="/discover">
            Khám phá gợi ý
          </Link>
          <h3>Góc trải nghiệm</h3>
          <div className="topic-links">
            <Link href="/feed?q=du+lịch">Du lịch</Link>
            <Link href="/feed?q=góc+làm+việc">Góc làm việc</Link>
            <Link href="/feed?q=chăm+sóc+bản+thân">Chăm sóc bản thân</Link>
          </div>
        </aside>
      </div>
    </>
  );
}
