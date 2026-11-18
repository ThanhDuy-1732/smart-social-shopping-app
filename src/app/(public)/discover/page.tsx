import Link from "next/link";
import { optionalActor } from "@/server/optional-actor";
import { discover } from "@/modules/discovery/service";
import { ProductGrid } from "@/components/product-grid";
import { PostCard } from "@/components/post-card";
import { ShoppingListEditor } from "@/components/shopping-list-editor";
import { DomainError } from "@/modules/shared/types";
export const dynamic = "force-dynamic";
export default async function Discover({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; budget?: string }>;
}) {
  const q = await searchParams,
    actor = await optionalActor();
  let result, error;
  try {
    if (q.q)
      result = await discover(actor, {
        query: q.q,
        budget: q.budget || undefined,
      });
  } catch (e) {
    if (!(e instanceof DomainError)) throw e;
    error = e.message;
  }
  return (
    <>
      <p className="eyebrow">Từ nhu cầu đến lựa chọn</p>
      <h1>Bạn đang chuẩn bị cho điều gì?</h1>
      <p>Thử “Tôi muốn đi Trung Quốc”, “góc làm việc” hoặc “chăm sóc da”.</p>
      <p className="notice">
        Chế độ local theo mẫu và từ khóa. AI chưa được kết nối.
      </p>
      <form className="panel" action="/discover">
        <label>
          Nhu cầu của bạn
          <input
            name="q"
            defaultValue={q.q ?? ""}
            minLength={3}
            maxLength={300}
            required
            placeholder="Tôi muốn đi Trung Quốc"
          />
        </label>
        <label>
          Ngân sách tối đa cho một món (₫)
          <input
            name="budget"
            defaultValue={q.budget ?? ""}
            inputMode="numeric"
            pattern="[0-9]{1,12}"
          />
        </label>
        <button>Tìm gợi ý</button>
      </form>
      <p>
        <Link href="/lists">Danh sách đã lưu</Link>
      </p>
      {error && <p role="alert">{error}</p>}
      {result && (
        <>
          <p className="muted">{result.notice}</p>
          {result.question && (
            <p className="notice">
              {result.question} Bạn có thể bổ sung vào ô nhu cầu.
            </p>
          )}
          {result.groups.map((g) => (
            <section className="section" key={g.title}>
              <h2>
                {g.title}{" "}
                <small className="muted">
                  {g.optional ? "Tùy chọn" : "Cân nhắc trước"}
                </small>
              </h2>
              <p>{g.reason}</p>
              <div className="row">
                {g.keywords.map((k) => (
                  <Link
                    className="button secondary"
                    href={`/search?q=${encodeURIComponent(k)}`}
                    key={k}
                  >
                    {k}
                  </Link>
                ))}
              </div>
              {g.products.length ? (
                <ProductGrid items={g.products} />
              ) : (
                <p className="muted">
                  Chưa có sản phẩm phù hợp đang bán. Bạn vẫn có thể lưu từ khóa
                  để chuẩn bị.
                </p>
              )}
              {g.posts.map((p) => (
                <PostCard key={p.id} post={p} signedIn={Boolean(actor)} />
              ))}
            </section>
          ))}
          <section className="panel">
            <h2>Lưu thành danh sách chuẩn bị</h2>
            {actor ? (
              <ShoppingListEditor
                title={q.q?.slice(0, 120) ?? "Danh sách mới"}
                items={result.groups
                  .flatMap((g) =>
                    g.keywords.map((keyword) => ({
                      label: keyword,
                      keyword,
                      checked: false,
                    })),
                  )
                  .slice(0, 40)}
              />
            ) : (
              <Link href="/login">Đăng nhập để lưu danh sách</Link>
            )}
          </section>
        </>
      )}
    </>
  );
}
