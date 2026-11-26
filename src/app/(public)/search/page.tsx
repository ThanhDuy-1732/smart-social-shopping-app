import Link from "next/link";
import { optionalActor } from "@/server/optional-actor";
import { ActivityView } from "@/components/activity-view";
import { searchCatalog, searchShops } from "@/modules/catalog/queries";
import { listCategories } from "@/modules/catalog/service";
import { DomainError } from "@/modules/shared/types";
import { CatalogGrid } from "@/components/catalog-grid";

export const dynamic = "force-dynamic";

const vnd = (value: string) => Number(value).toLocaleString("vi-VN");

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

  const withParams = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(q))
      if (value && key !== "cursor") params.set(key, value);
    for (const [key, value] of Object.entries(patch))
      if (value === undefined) params.delete(key);
      else params.set(key, value);
    return `/search?${params.toString()}`;
  };

  const summary: { label: string; value: string }[] = [];
  if (q.q) summary.push({ label: "Từ khoá", value: q.q });
  if (selected) summary.push({ label: "Ngành hàng", value: selected.name });
  if (q.min || q.max)
    summary.push({
      label: "Giá",
      value: [
        q.min ? `từ ${vnd(q.min)} ₫` : "",
        q.max ? `đến ${vnd(q.max)} ₫` : "",
      ]
        .filter(Boolean)
        .join(" "),
    });
  if (q.inStock === "1")
    summary.push({ label: "Tồn kho", value: "chỉ còn hàng" });
  for (const def of selected?.attributes ?? []) {
    const value = q[`attr.${def.key}`];
    if (value?.trim()) summary.push({ label: def.label, value });
  }

  const title = q.q ? (
    <>
      Kết quả cho <em>“{q.q}”</em>
    </>
  ) : selected ? (
    selected.name
  ) : (
    "Mọi món đang bán"
  );

  return (
    <div className="d-surface">
      <div className="d-bg" aria-hidden="true" />
      {actor && q.q && <ActivityView kind="search" targetId={q.q} />}

      <section className="d-search-hero">
        <div className="d-hero-grid">
          <div>
            <h1>
              Tìm món,
              <br />
              đỡ mua thừa.
            </h1>
            <p className="d-sub">
              Món đang bán thật, kèm bài chia sẻ từ người đã dùng qua.
            </p>
            <form className="d-bigfind" action="/search">
              <svg
                aria-hidden="true"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              >
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="M15.5 15.5 20 20" />
              </svg>
              <input
                name="q"
                defaultValue={q.q}
                maxLength={300}
                placeholder="Bạn đang tìm món gì?"
                aria-label="Tìm sản phẩm"
              />
              <button type="submit">Tìm món</button>
            </form>
          </div>

          <aside className="d-note">
            <span className="d-note-label">Đang lọc</span>
            <div className="d-note-count">
              <b>{result?.items.length ?? 0}</b>
              <span>món đang hiển thị</span>
            </div>
            {summary.length > 0 ? (
              <ul>
                {summary.map((row) => (
                  <li key={row.label}>
                    <b>{row.label}</b>
                    <span>{row.value}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="d-note-empty">
                Chưa chọn bộ lọc. Ngành hàng sẽ mở thêm thuộc tính riêng.
              </p>
            )}
            <Link className="d-note-link" href="/search">
              Bắt đầu lại
            </Link>
          </aside>
        </div>
      </section>

      <div className="d-catalog">
        <form className="d-filter" action="/search">
          <h2>Bộ lọc</h2>
          {q.q && <input type="hidden" name="q" value={q.q} />}

          <label className="d-field">
            Ngành hàng
            <select name="category" defaultValue={q.category ?? ""}>
              <option value="">Tất cả ngành hàng</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <div className="d-field">
            <span>Giá (VND)</span>
            <div className="d-price-inputs">
              <input
                name="min"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Từ"
                aria-label="Giá từ"
                defaultValue={q.min}
              />
              <input
                name="max"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Đến"
                aria-label="Giá đến"
                defaultValue={q.max}
              />
            </div>
          </div>

          <label className="d-opt">
            <input
              type="checkbox"
              name="inStock"
              value="1"
              defaultChecked={q.inStock === "1"}
            />
            <span>Chỉ hiện biến thể còn hàng</span>
          </label>

          {selected?.attributes.map((def) => (
            <label className="d-field" key={def.key}>
              {def.label}
              {def.kind === "select" ? (
                <select
                  name={`attr.${def.key}`}
                  defaultValue={q[`attr.${def.key}`] ?? ""}
                >
                  <option value="">Tất cả</option>
                  {def.options?.map((value) => (
                    <option key={value} value={value}>
                      {value}
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

          <p className="d-filter-hint">
            Có thể nhập tên shop vào ô tìm kiếm. Chọn ngành hàng rồi bấm lọc để
            mở bộ lọc thuộc tính.
          </p>

          <div className="d-filter-actions">
            <button type="submit">Lọc kết quả</button>
            <Link href="/search">Xoá lọc</Link>
          </div>
        </form>

        <section className="d-results">
          <div className="d-results-head">
            <h2>{title}</h2>
            <p>{result?.items.length ?? 0} món đang hiển thị</p>
          </div>

          <div className="d-quick" aria-label="Lọc nhanh">
            <Link
              href={withParams({
                inStock: q.inStock === "1" ? undefined : "1",
              })}
              aria-current={q.inStock === "1" ? "true" : undefined}
            >
              Còn hàng
            </Link>
            <Link
              href={withParams({ max: "1000000" })}
              aria-current={q.max === "1000000" ? "true" : undefined}
            >
              Dưới 1 triệu
            </Link>
            <Link
              href={withParams({ max: "2000000" })}
              aria-current={q.max === "2000000" ? "true" : undefined}
            >
              Dưới 2 triệu
            </Link>
            <span>lọc nhanh, giữ nguyên từ khoá</span>
          </div>

          {error ? (
            <p className="d-error" role="alert">
              {error}
            </p>
          ) : result?.items.length ? (
            <CatalogGrid items={result.items} />
          ) : (
            <div className="d-empty">
              <h2>Chưa có sản phẩm phù hợp</h2>
              <p>Thử từ khoá khác hoặc bỏ bớt bộ lọc.</p>
              <p className="d-more">
                <Link href="/search">Xem tất cả sản phẩm</Link>
              </p>
            </div>
          )}

          {result?.nextCursor && (
            <p className="d-more">
              <Link href={`/search?${next.toString()}`}>
                Xem thêm sản phẩm
              </Link>
            </p>
          )}

          {shops.length > 0 && (
            <section className="d-shops">
              <div className="d-sec-head">
                <h2>Gian hàng khớp tên</h2>
                <p>{shops.length} gian hàng</p>
              </div>
              <div className="d-shop-list">
                {shops.map((shop) => (
                  <Link
                    className="d-shop-card"
                    href={`/shops/${shop.id}`}
                    key={shop.id}
                  >
                    <div>
                      <strong>{shop.name}</strong>
                      <p>{shop.description}</p>
                    </div>
                    <span>xem shop</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </section>
      </div>
    </div>
  );
}
