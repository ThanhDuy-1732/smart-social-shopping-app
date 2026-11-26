import Link from "next/link";
import { optionalActor } from "@/server/optional-actor";
import { listFeed } from "@/modules/social/queries";
import { DomainError } from "@/modules/shared/types";
import { CommunityPostCard } from "@/components/community-post-card";

export const dynamic = "force-dynamic";

const money = (value: string) => `${BigInt(value).toLocaleString("vi-VN")} ₫`;

export default async function Feed({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; q?: string; cursor?: string }>;
}) {
  const actor = await optionalActor();
  const q = await searchParams;
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

  const items = result?.items ?? [];
  const [lead, ...rest] = items;
  const topics = [
    ...new Set(items.flatMap((post) => post.topics)),
  ].slice(0, 6);
  const mentioned = items
    .flatMap((post) => post.products)
    .filter((product) => product.available && product.price)
    .filter(
      (product, index, list) =>
        list.findIndex((item) => item.id === product.id) === index,
    )
    .slice(0, 4);

  return (
    <div className="d-surface">
      <div className="d-bg" aria-hidden="true" />
      <div className="d-shell">
        <div className="d-bar">
          <div className="d-seg" aria-label="Bảng tin">
            <Link
              href="/feed"
              aria-current={
                !q.mode || q.mode === "explore" ? "page" : undefined
              }
            >
              Khám phá
            </Link>
            <Link
              href="/feed?mode=following"
              aria-current={q.mode === "following" ? "page" : undefined}
            >
              Theo dõi
            </Link>
            <Link
              href="/feed?mode=saved"
              aria-current={q.mode === "saved" ? "page" : undefined}
            >
              Đã lưu
            </Link>
          </div>
          <form className="d-find" action="/feed">
            {q.mode && <input type="hidden" name="mode" value={q.mode} />}
            <svg
              aria-hidden="true"
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="M15.5 15.5 20 20" />
            </svg>
            <input
              name="q"
              defaultValue={q.q}
              placeholder="Tìm bài viết, món đồ"
              aria-label="Tìm bài chia sẻ"
              maxLength={300}
            />
          </form>
          <Link
            className="d-cta"
            href={actor ? "/posts/new" : "/login"}
          >
            Chia sẻ
          </Link>
        </div>

        <header className="d-intro">
          <h1>
            Người mua thật,
            <br />
            món dùng thật.
          </h1>
          {!error && (
            <p>
              {items.length} bài đang hiển thị
              {q.q ? ` / tìm “${q.q}”` : ""}
            </p>
          )}
        </header>

        {error ? (
          <>
            <p className="d-error" role="alert">
              {error}
            </p>
            {!actor && (
              <p className="d-more">
                <Link href="/login">Đăng nhập</Link>
              </p>
            )}
          </>
        ) : !lead ? (
          <div className="d-empty">
            <h2>Những câu chuyện đang chờ bạn</h2>
            <p>
              Chia sẻ món bạn đang dùng hoặc theo dõi người có cùng sở thích.
            </p>
            <p className="d-more">
              <Link href={actor ? "/posts/new" : "/register"}>
                {actor ? "Viết bài đầu tiên" : "Tạo tài khoản để viết"}
              </Link>
            </p>
          </div>
        ) : (
          <>
            <section className="d-hero">
              <CommunityPostCard
                post={lead}
                signedIn={Boolean(actor)}
                featured
              />
              <aside className="d-side">
                {topics.length > 0 && (
                  <section className="d-tile">
                    <h2>Chủ đề trong trang</h2>
                    <div className="d-tags">
                      {topics.map((topic) => (
                        <Link
                          key={topic}
                          href={`/feed?q=${encodeURIComponent(topic)}`}
                        >
                          #{topic}
                        </Link>
                      ))}
                    </div>
                    <p className="d-tile-note">
                      Chọn một chủ đề để lọc bài viết cùng mối quan tâm.
                    </p>
                  </section>
                )}

                {mentioned.length > 0 && (
                  <section className="d-price-slip">
                    <span className="d-mini-label">Món đang được nhắc</span>
                    <ul className="d-mini-list">
                      {mentioned.map((product) => (
                        <li key={product.id}>
                          <Link href={`/products/${product.id}`}>
                            <span>{product.name}</span>
                            <b>{money(product.price!)}</b>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <Link
                  className="d-write"
                  href={actor ? "/posts/new" : "/register"}
                >
                  <h2>{actor ? "Bạn vừa mua gì?" : "Ghi lại lần mua đầu tiên"}</h2>
                  <p>
                    Một tấm ảnh và vài câu là đủ để người sau đỡ mua nhầm.
                  </p>
                  <span>{actor ? "Viết bài" : "Tạo tài khoản"}</span>
                </Link>
              </aside>
            </section>

            {rest.length > 0 && (
              <section className="d-feed">
                <div className="d-sec-head">
                  <h2>Bài mới từ cộng đồng</h2>
                  <p>{rest.length} bài trong trang này</p>
                </div>
                <div className="d-cards">
                  {rest.map((post) => (
                    <CommunityPostCard
                      key={post.id}
                      post={post}
                      signedIn={Boolean(actor)}
                    />
                  ))}
                </div>
              </section>
            )}

            {result?.nextCursor && (
              <p className="d-more">
                <Link href={`/feed?${next}`}>Xem thêm bài</Link>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
