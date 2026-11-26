import Link from "next/link";
import { Icon, PreviewBar, Shot } from "../_ui";
import { categories, money, products } from "../_data";

const suggestions = [
  "nồi chiên không dầu",
  "giày chạy bộ",
  "đèn học cho bé",
  "balo 15 inch",
];

export function SearchB() {
  return (
    <div className="pv pv-b">
      <div className="pv-bg" aria-hidden="true" />

      <section className="pvb-searchhero">
        <h1>
          Tìm đúng món,
          <br />
          đỡ mua thừa.
        </h1>
        <p className="pvb-sub">
          Món đang bán thật, kèm bài chia sẻ từ người đã dùng qua.
        </p>
        <form className="pvb-bigfind" action="/search">
          <Icon name="search" size={22} />
          <input
            name="q"
            defaultValue="nồi chiên không dầu"
            aria-label="Tìm sản phẩm"
            placeholder="Bạn đang tìm món gì?"
          />
          <button type="submit">Tìm món</button>
        </form>
        <div className="pvb-sugg">
          <span>Mọi người đang tìm</span>
          {suggestions.map((item) => (
            <Link key={item} href="/search">
              {item}
            </Link>
          ))}
        </div>
      </section>

      <section className="pvb-cats">
        <div className="pvb-sec-head">
          <h2>Mua theo nhu cầu</h2>
          <p>402 món từ 38 nhà bán đang hoạt động</p>
        </div>
        <div className="pvb-bento">
          {categories.map((category, index) => (
            <Link
              key={category.id}
              href="/search"
              className={`pvb-tilecat tone-${category.tone} ${
                index === 0 || index === categories.length - 1 ? "wide" : ""
              }`}
            >
              <strong>{category.name}</strong>
              <span>{category.count} món</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="pvb-results">
        <div className="pvb-sec-head">
          <h2>
            Kết quả cho <em>“nồi chiên không dầu”</em>
          </h2>
          <p>6 món</p>
        </div>

        <div className="pvb-filters" aria-label="Lọc nhanh">
          <button type="button" className="on">
            Còn hàng
          </button>
          <button type="button">Dưới 1 triệu</button>
          <button type="button">Có bài chia sẻ</button>
          <button type="button">Giao trong 2 ngày</button>
          <Link href="/search">Bộ lọc đầy đủ</Link>
        </div>

        <div className="pvb-products">
          {products.map((product) => (
            <article className="pvb-product" key={product.id}>
              <Link href={`/search?q=${encodeURIComponent(product.name)}`}>
                <Shot tone={product.tone} ratio="1/1" />
                <div className="pvb-product-body">
                  <p className="pvb-product-shop">{product.shop}</p>
                  <h3>{product.name}</h3>
                  <p className="pvb-product-price">
                    {money(product.price)}
                    <span
                      className={product.stock > 0 ? "in" : "out"}
                      aria-label={
                        product.stock > 0 ? "Còn hàng" : "Tạm hết hàng"
                      }
                    />
                  </p>
                  <p className="pvb-product-note">{product.note}</p>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <PreviewBar dir="b" view="search" />
    </div>
  );
}
