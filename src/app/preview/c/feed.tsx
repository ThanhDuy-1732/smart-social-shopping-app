import Link from "next/link";
import { PreviewBar, Shot } from "../_ui";
import { money, posts, productById, products, topics } from "../_data";

export function FeedC() {
  return (
    <div className="pv pv-c">
      <div className="pv-bg" aria-hidden="true" />

      <header className="pvc-head">
        <h1>Bảng tin</h1>
        <p>Người thật, món thật, giá thật. Bài nào cũng có món để xem tiếp.</p>
        <nav className="pvc-tabs" aria-label="Bảng tin">
          <Link href="/preview/c?view=feed" aria-current="page">
            Khám phá
          </Link>
          <Link href="/preview/c?view=feed">Đang theo dõi</Link>
          <Link href="/preview/c?view=feed">Đã lưu</Link>
          <Link className="pvc-tabs-new" href="/posts/new">
            Viết bài mới
          </Link>
        </nav>
      </header>

      <div className="pvc-layout">
        <div className="pvc-feed">
          {posts.slice(0, 4).map((post) => {
            const product = productById(post.products[0]);
            return (
              <article className="pvc-post" key={post.id}>
                <header className="pvc-post-head">
                  <span className="pvc-ava">{post.initial}</span>
                  <div className="pvc-post-who">
                    <strong>{post.author}</strong>
                    <span>{post.when}</span>
                  </div>
                  <span className="pvc-sticker">{post.used}</span>
                </header>

                <Shot tone={post.tone} ratio="16/9" className="pvc-post-img" />

                <h2>
                  <Link href={`/posts/${post.id}`}>{post.title}</Link>
                </h2>
                <p className="pvc-text">{post.text}</p>

                <ul className="pvc-lines" aria-label="Món trong bài">
                  <li>
                    <span>{product.name}</span>
                    <i aria-hidden="true" />
                    <b>{money(product.price)}</b>
                  </li>
                  <li>
                    <span>{product.shop}</span>
                    <i aria-hidden="true" />
                    <b>{product.stock > 0 ? `còn ${product.stock}` : "hết hàng"}</b>
                  </li>
                </ul>

                <footer className="pvc-actions">
                  <button type="button" className="pvc-like">
                    Thích {post.likes}
                  </button>
                  <button type="button">Lưu bài</button>
                  <Link href={`/posts/${post.id}`}>
                    Bình luận {post.comments}
                  </Link>
                </footer>
              </article>
            );
          })}

          <p className="pvc-more">
            <Link href="/feed">Tải thêm bài cũ</Link>
          </p>
        </div>

        <aside className="pvc-side">
          <section className="pvc-slip">
            <h2>Giá đang bán</h2>
            <ul className="pvc-prices">
              {products.slice(0, 4).map((product) => (
                <li key={product.id}>
                  <Link href="/search">
                    <span>{product.name}</span>
                    <b>{money(product.price)}</b>
                  </Link>
                </li>
              ))}
            </ul>
            <Link className="pvc-slip-link" href="/search">
              So sánh tất cả
            </Link>
          </section>

          <section className="pvc-slip">
            <h2>Chủ đề</h2>
            <div className="pvc-tags">
              {topics.map((topic) => (
                <Link key={topic.name} href="/feed">
                  #{topic.name} <span>{topic.count}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="pvc-slip pvc-slip-write">
            <h2>Bạn vừa mua gì?</h2>
            <p>
              Một tấm ảnh và ba câu là đủ để người sau đỡ mua nhầm.
            </p>
            <Link className="pvc-write" href="/posts/new">
              Viết bài
            </Link>
          </section>
        </aside>
      </div>

      <PreviewBar dir="c" view="feed" />
    </div>
  );
}
