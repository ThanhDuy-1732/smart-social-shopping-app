import { optionalActor } from "@/server/optional-actor";
import { ActivityView } from "@/components/activity-view";
import Link from "next/link";
import { searchCatalog } from "@/modules/catalog/queries";
import { listCategories } from "@/modules/catalog/service";
import { DomainError } from "@/modules/shared/types";
import { ProductGrid } from "@/components/product-grid";
export const dynamic = "force-dynamic";
export default async function Search({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const q = await searchParams;
  const actor = await optionalActor();
  let result, error;
  try {
    result = await searchCatalog({
      query: q.q,
      categoryId: q.category || undefined,
      minPrice: q.min || undefined,
      maxPrice: q.max || undefined,
      cursor: q.cursor,
    });
  } catch (e) {
    if (!(e instanceof DomainError)) throw e;
    error = e.message;
  }
  const categories = await listCategories();
  const next = new URLSearchParams(
    Object.entries(q).filter((p): p is [string, string] => Boolean(p[1])),
  );
  if (result?.nextCursor) next.set("cursor", result.nextCursor);
  return (
    <>
      <h1>Tìm món bạn cần</h1>
      {actor && q.q && <ActivityView kind="search" targetId={q.q} />}
      <form className="panel form" action="/search">
        <div className="two-col">
          <label>
            Tìm sản phẩm
            <input
              name="q"
              defaultValue={q.q}
              maxLength={300}
              placeholder="Tên sản phẩm hoặc điều bạn cần"
            />
          </label>
          <label>
            Ngành hàng
            <select name="category" defaultValue={q.category ?? ""}>
              <option value="">Tất cả ngành hàng</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Giá từ (VND)
            <input
              name="min"
              inputMode="numeric"
              pattern="[0-9]*"
              defaultValue={q.min}
            />
          </label>
          <label>
            Giá đến (VND)
            <input
              name="max"
              inputMode="numeric"
              pattern="[0-9]*"
              defaultValue={q.max}
            />
          </label>
        </div>
        <button>Tìm sản phẩm</button>
      </form>
      <section className="section">
        {error ? (
          <p role="alert" className="notice error">
            {error}
          </p>
        ) : result?.items.length ? (
          <ProductGrid items={result.items} />
        ) : (
          <div className="panel empty">
            <h2>Chưa có sản phẩm phù hợp</h2>
            <p className="muted">Thử từ khóa khác hoặc bỏ bớt bộ lọc.</p>
          </div>
        )}
        {result?.nextCursor && (
          <p>
            <Link
              className="button secondary"
              href={`/search?${next.toString()}`}
            >
              Xem thêm sản phẩm
            </Link>
          </p>
        )}
      </section>
    </>
  );
}
