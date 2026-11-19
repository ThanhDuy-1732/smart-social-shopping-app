import { optionalActor } from "@/server/optional-actor";
import { ActivityView } from "@/components/activity-view";
import Link from "next/link";
import { searchCatalog, searchShops } from "@/modules/catalog/queries";
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
  const categories = await listCategories();
  const selected = categories.find((c) => c.id === q.category);
  const attributes: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(q))
    if (key.startsWith("attr.") && value?.trim()) {
      const attribute = key.slice(5),
        def = selected?.attributes.find((d) => d.key === attribute);
      attributes[attribute] = def?.kind === "number" ? Number(value) : value;
    }
  let shops: Awaited<ReturnType<typeof searchShops>> = [];
  let result, error;
  try {
    result = await searchCatalog({
      query: q.q,
      categoryId: q.category || undefined,
      minPrice: q.min || undefined,
      maxPrice: q.max || undefined,
      cursor: q.cursor,
      attributes,
      inStock: q.inStock === "1",
    });
    if (q.q) shops = await searchShops(q.q);
  } catch (e) {
    if (!(e instanceof DomainError)) throw e;
    error = e.message;
  }
  const next = new URLSearchParams(
    Object.entries(q).filter((p): p is [string, string] => Boolean(p[1])),
  );
  if (result?.nextCursor) next.set("cursor", result.nextCursor);
  return (
    <>
      <div className="section-intro">
        <h1>Tìm món bạn cần</h1>
      </div>
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
        <label className="inline-check">
          <input
            type="checkbox"
            name="inStock"
            value="1"
            defaultChecked={q.inStock === "1"}
          />{" "}
          Chỉ hiện biến thể còn hàng
        </label>
        {selected?.attributes.map((def) => (
          <label key={def.key}>
            {def.label}
            {def.kind === "select" ? (
              <select
                name={`attr.${def.key}`}
                defaultValue={q[`attr.${def.key}`] ?? ""}
              >
                <option value="">Tất cả</option>
                {def.options?.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name={`attr.${def.key}`}
                type={def.kind === "number" ? "number" : "text"}
                step={def.kind === "number" ? "any" : undefined}
                defaultValue={q[`attr.${def.key}`] ?? ""}
                maxLength={500}
              />
            )}
          </label>
        ))}
        <p className="hint">
          Có thể nhập tên shop vào ô tìm kiếm. Chọn ngành hàng và tìm lại để mở
          bộ lọc thuộc tính.
        </p>
        <button>Tìm sản phẩm</button>
      </form>
      {shops.length > 0 && (
        <section className="section">
          <h2>Gian hàng khớp tên</h2>
          <div className="grid">
            {shops.map((shop) => (
              <article className="panel" key={shop.id}>
                <Link href={`/shops/${shop.id}`}>{shop.name}</Link>
                <p>{shop.description}</p>
              </article>
            ))}
          </div>
        </section>
      )}
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
