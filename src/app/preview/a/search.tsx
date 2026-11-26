import Link from "next/link";
import { Icon, PreviewBar, Shot } from "../_ui";
import { categories, money, products } from "../_data";

export function SearchA() {
  return (
    <div className="pv pv-a">
      <div className="pv-bg" aria-hidden="true" />

      <header className="pva-mast pva-mast-search">
        <div className="pva-mast-id">
          <p className="pva-label">Tìm món</p>
          <h1>
            Tìm món,
            <br />
            không tìm quảng cáo.
          </h1>
          <form className="pva-bigfind" action="/search">
            <Icon name="search" size={22} />
            <input
              name="q"
              defaultValue="nồi chiên không dầu"
              aria-label="Tìm sản phẩm"
              placeholder="Bạn cần gì cho hôm nay?"
            />
            <button type="submit">Tìm</button>
          </form>
          <nav className="pva-index" aria-label="Ngành hàng">
            {categories.map((category, index) => (
              <Link
                key={category.id}
                href="/search"
                aria-current={index === 0 ? "page" : undefined}
              >
                {category.name}
                <span>{category.count}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <div className="pva-catalog">
        <aside className="pva-filters">
          <h2>Lọc kết quả</h2>

          <fieldset>
            <legend>Ngành hàng</legend>
            {categories.map((category, index) => (
              <label key={category.id} className="pva-opt">
                <input
                  type="radio"
                  name="category"
                  defaultChecked={index === 0}
                />
                <span>{category.name}</span>
                <span className="pva-num">{category.count}</span>
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>Giá</legend>
            <div className="pva-price">
              <label>
                Từ
                <input name="min" inputMode="numeric" placeholder="0" />
              </label>
              <label>
                Đến
                <input name="max" inputMode="numeric" placeholder="2.000.000" />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Tình trạng</legend>
            <label className="pva-opt">
              <input type="checkbox" name="inStock" defaultChecked />
              <span>Chỉ hiện món còn hàng</span>
            </label>
            <label className="pva-opt">
              <input type="checkbox" name="reviewed" />
              <span>Có bài chia sẻ từ người dùng</span>
            </label>
          </fieldset>

          <p className="pva-reset">
            <Link href="/search">Bỏ toàn bộ bộ lọc</Link>
          </p>
        </aside>

        <section className="pva-results">
          <div className="pva-results-head">
            <h2>
              6 món cho <em>“nồi chiên không dầu”</em>
            </h2>
            <div className="pva-sort" aria-label="Sắp xếp">
              <Link href="/search" aria-current="page">
                Liên quan
              </Link>
              <Link href="/search">Giá thấp</Link>
              <Link href="/search">Mới đăng</Link>
            </div>
          </div>
          <p className="pva-results-note">
            Giá lấy từ nhà bán, đã gồm VAT. Bài chia sẻ do người mua tự viết.
          </p>

          <div className="pva-products">
            {products.map((product) => (
              <article className="pva-prod" key={product.id}>
                <Link
                  className="pva-prod-link"
                  href={`/search?q=${encodeURIComponent(product.name)}`}
                >
                  <Shot
                    tone={product.tone}
                    ratio="4/5"
                    label={product.category.toLowerCase()}
                  />
                  <p className="pva-prod-shop">{product.shop}</p>
                  <h3>{product.name}</h3>
                  <p className="pva-prod-price">{money(product.price)}</p>
                  <p className="pva-prod-note">{product.note}</p>
                  <p className="pva-prod-stock">
                    {product.stock > 0 ? `Còn ${product.stock} món` : "Tạm hết hàng"}
                    <span>{product.stock > 0 ? "Giao 2–4 ngày" : "Hẹn có lại"}</span>
                  </p>
                </Link>
              </article>
            ))}
          </div>

          <p className="pva-more">
            <Link href="/search">Xem thêm 8 món</Link>
          </p>
        </section>
      </div>

      <PreviewBar dir="a" view="search" />
    </div>
  );
}
