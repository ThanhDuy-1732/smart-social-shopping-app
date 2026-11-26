import Link from "next/link";
import { Icon, PreviewBar, Shot } from "../_ui";
import { categories, money, products } from "../_data";

const suggestions = [
  "nồi chiên không dầu",
  "giày chạy bộ",
  "đèn học cho bé",
  "balo 15 inch",
];

export function SearchD() {
  return (
    <div className="pv pv-d">
      <div className="pv-bg" aria-hidden="true" />

      <section className="pvd-searchhero">
        <div className="pvd-hero-grid">
          <div>
            <h1>
              Tìm món,
              <br />
              đỡ mua thừa.
            </h1>
            <p className="pvd-sub">
              Món đang bán thật, kèm bài chia sẻ từ người đã dùng qua.
            </p>
            <form className="pvd-bigfind" action="/search">
              <Icon name="search" size={22} />
              <input
                name="q"
                defaultValue="nồi chiên không dầu"
                aria-label="Tìm sản phẩm"
                placeholder="Bạn đang tìm món gì?"
              />
              <button type="submit">Tìm món</button>
            </form>
            <div className="pvd-sugg">
              <span>Mọi người đang tìm</span>
              {suggestions.map((item) => (
                <Link key={item} href="/search">
                  {item}
                </Link>
              ))}
            </div>
          </div>

          <aside className="pvd-note">
            <span className="pvd-note-label">Tuần này</span>
            <ul>
              <li>
                <b>38</b>
                <span>món mới có bài chia sẻ</span>
              </li>
              <li>
                <b>6</b>
                <span>món dưới 500.000 ₫</span>
              </li>
              <li>
                <b>2</b>
                <span>nhà bán giao trong ngày</span>
              </li>
            </ul>
            <Link className="pvd-note-link" href="/search">
              Cách mình chọn món
            </Link>
          </aside>
        </div>
      </section>

      <section className="pvd-cats">
        <div className="pvd-sec-head">
          <h2>Mua theo nhu cầu</h2>
          <p>402 món / 38 nhà bán</p>
        </div>
        <div className="pvd-cats-grid">
          {categories.map((category, index) => (
            <Link
              key={category.id}
              href="/search"
              className={`pvd-cat tone-${category.tone} ${
                index === 0 || index === categories.length - 1 ? "wide" : ""
              }`}
            >
              <span className="pvd-cat-label">
                {category.name}
                <b>{category.count}</b>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="pvd-results">
        <div className="pvd-sec-head">
          <h2>Kết quả cho “nồi chiên không dầu”</h2>
          <p>6 món / giá đã gồm VAT</p>
        </div>

        <div className="pvd-filters" aria-label="Lọc nhanh">
          <button type="button" className="on">
            Còn hàng
          </button>
          <button type="button">Dưới 1 triệu</button>
          <button type="button">Có bài chia sẻ</button>
          <button type="button">Giao trong 2 ngày</button>
          <Link href="/search">Bộ lọc đầy đủ</Link>
        </div>

        <div className="pvd-products">
          {products.map((product) => (
            <article className="pvd-product" key={product.id}>
              <Link href={`/search?q=${encodeURIComponent(product.name)}`}>
                <div className="pvd-product-shot">
                  <Shot tone={product.tone} ratio="1/1" />
                  {product.stock === 0 ? (
                    <span className="pvd-stamp out">Hết hàng</span>
                  ) : product.stock <= 4 ? (
                    <span className="pvd-stamp">Còn {product.stock}</span>
                  ) : null}
                </div>
                <div className="pvd-product-body">
                  <span className="pvd-shop">{product.shop}</span>
                  <h3>{product.name}</h3>
                  <div className="pvd-price">
                    <b>{money(product.price)}</b>
                    <span className={product.stock > 0 ? "in" : "out"}>
                      {product.stock > 0 ? "còn hàng" : "hết hàng"}
                    </span>
                  </div>
                  <p className="pvd-prod-note">{product.note}</p>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <PreviewBar dir="d" view="search" />
    </div>
  );
}
