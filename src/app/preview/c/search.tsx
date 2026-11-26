import Link from "next/link";
import { PreviewBar, Shot } from "../_ui";
import { categories, money, products } from "../_data";

export function SearchC() {
  return (
    <div className="pv pv-c">
      <div className="pv-bg" aria-hidden="true" />

      <header className="pvc-head pvc-head-search">
        <h1>Tìm món</h1>
        <p>Nhập điều bạn cần, mình sẽ tìm món đang bán thật.</p>

        <form className="pvc-ticketfind" action="/search">
          <label>
            Bạn cần gì
            <input
              name="q"
              defaultValue="nồi chiên không dầu"
              placeholder="ví dụ: nồi chiên cho 4 người"
            />
          </label>
          <label>
            Giá đến
            <input name="max" inputMode="numeric" placeholder="2.000.000" />
          </label>
          <button type="submit">Tìm món</button>
        </form>

        <div className="pvc-tags pvc-tags-search">
          {categories.map((category, index) => (
            <Link
              key={category.id}
              href="/search"
              aria-current={index === 0 ? "page" : undefined}
            >
              {category.name} <span>{category.count}</span>
            </Link>
          ))}
        </div>
      </header>

      <div className="pvc-layout pvc-layout-search">
        <aside className="pvc-side">
          <section className="pvc-slip pvc-filter">
            <h2>Bảng lọc</h2>
            <fieldset>
              <legend>Ngành hàng</legend>
              {categories.slice(0, 4).map((category, index) => (
                <label key={category.id}>
                  <input
                    type="radio"
                    name="category"
                    defaultChecked={index === 0}
                  />
                  <span>{category.name}</span>
                  <b>{category.count}</b>
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend>Khoảng giá</legend>
              <div className="pvc-range">
                <input inputMode="numeric" placeholder="0" aria-label="Giá từ" />
                <input
                  inputMode="numeric"
                  placeholder="2.000.000"
                  aria-label="Giá đến"
                />
              </div>
            </fieldset>
            <fieldset>
              <legend>Khác</legend>
              <label>
                <input type="checkbox" defaultChecked />
                <span>Chỉ món còn hàng</span>
              </label>
              <label>
                <input type="checkbox" />
                <span>Có người đã viết bài</span>
              </label>
            </fieldset>
            <Link className="pvc-slip-link" href="/search">
              Xoá bộ lọc
            </Link>
          </section>
        </aside>

        <section className="pvc-results">
          <div className="pvc-results-head">
            <h2>
              6 món cho <em>“nồi chiên không dầu”</em>
            </h2>
            <div className="pvc-sort">
              <Link href="/search" aria-current="page">
                Liên quan
              </Link>
              <Link href="/search">Giá thấp</Link>
              <Link href="/search">Mới đăng</Link>
            </div>
          </div>

          <div className="pvc-products">
            {products.map((product) => (
              <article className="pvc-product" key={product.id}>
                <Link href={`/search?q=${encodeURIComponent(product.name)}`}>
                  <div className="pvc-product-shot">
                    <Shot tone={product.tone} ratio="1/1" />
                    {product.stock === 0 ? (
                      <span className="pvc-stamp out">Hết hàng</span>
                    ) : product.stock <= 4 ? (
                      <span className="pvc-stamp">Còn {product.stock}</span>
                    ) : null}
                  </div>
                  <div className="pvc-product-body">
                    <span className="pvc-shop">{product.shop}</span>
                    <h3>{product.name}</h3>
                    <p className="pvc-price">
                      <b>{money(product.price)}</b>
                    </p>
                    <p className="pvc-note">{product.note}</p>
                    <span className="pvc-stockline">
                      {product.stock > 0
                        ? "Giao 2–4 ngày · đổi 7 ngày"
                        : "Hẹn có lại trong tuần"}
                    </span>
                  </div>
                </Link>
              </article>
            ))}
          </div>

          <p className="pvc-more">
            <Link href="/search">Xem thêm 8 món</Link>
          </p>
        </section>
      </div>

      <PreviewBar dir="c" view="search" />
    </div>
  );
}
