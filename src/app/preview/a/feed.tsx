import Link from "next/link";
import { Icon, PreviewBar, Shot } from "../_ui";
import { money, posts, productById, shops, topics } from "../_data";

const tabs = [
  { label: "Khám phá", href: "/preview/a?view=feed", current: true },
  { label: "Đang theo dõi", href: "/preview/a?view=feed" },
  { label: "Đã lưu", href: "/preview/a?view=feed" },
];

export function FeedA() {
  const [lead, ...rest] = posts;
  const leadProduct = productById(lead.products[0]);

  return (
    <div className="pv pv-a">
      <div className="pv-bg" aria-hidden="true" />

      <header className="pva-mast">
        <div className="pva-mast-id">
          <p className="pva-label">Cộng đồng Mình dùng</p>
          <h1>
            Chuyện mua sắm,
            <br />
            kể từ người dùng thật.
          </h1>
          <p className="pva-lede">
            1.248 câu chuyện đã dùng, ghi lại đúng lúc còn mới. Không tài trợ,
            không xếp hạng.
          </p>
        </div>
        <div className="pva-mast-tools">
          <form className="pva-find" action="/search">
            <Icon name="search" size={16} />
            <input
              name="q"
              placeholder="Tìm trong cộng đồng"
              aria-label="Tìm trong cộng đồng"
            />
          </form>
          <Link className="pva-write" href="/posts/new">
            Viết bài
          </Link>
        </div>
      </header>

      <nav className="pva-tabs" aria-label="Bảng tin">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            aria-current={tab.current ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
        <span className="pva-tabs-note">Cập nhật 8 phút trước</span>
      </nav>

      <div className="pva-body">
        <div className="pva-main">
          <article className="pva-lead">
            <Shot tone={lead.tone} ratio="16/9" label={lead.topic} />
            <p className="pva-meta">
              <strong>{lead.author}</strong>
              <span>{lead.when}</span>
            </p>
            <h2>
              <Link href="/posts/post-1">{lead.title}</Link>
            </h2>
            <p className="pva-excerpt">{lead.text}</p>
            <div className="pva-lead-foot">
              <Link className="pva-item" href="/search?q=noi+chien">
                {leadProduct.name}
                <span>{money(leadProduct.price)}</span>
              </Link>
              <p className="pva-count">
                {lead.likes} người thấy hữu ích · {lead.comments} bình luận
              </p>
            </div>
          </article>

          <div className="pva-list">
            {rest.slice(0, 4).map((post) => {
              const product = productById(post.products[0]);
              return (
                <article className="pva-row" key={post.id}>
                  <Shot tone={post.tone} ratio="4/3" label={post.topic} />
                  <div className="pva-row-text">
                    <p className="pva-meta">
                      <strong>{post.author}</strong>
                      <span>{post.when}</span>
                    </p>
                    <h3>
                      <Link href={`/posts/${post.id}`}>{post.title}</Link>
                    </h3>
                    <p className="pva-row-excerpt">{post.text}</p>
                    <p className="pva-row-foot">
                      <Link href="/search?q=" className="pva-item">
                        {product.name}
                        <span>{money(product.price)}</span>
                      </Link>
                      <span className="pva-count">
                        {post.likes} thích · {post.comments} bình luận
                      </span>
                    </p>
                  </div>
                </article>
              );
            })}
          </div>

          <p className="pva-more">
            <Link href="/feed">Xem thêm câu chuyện cũ</Link>
          </p>
        </div>

        <aside className="pva-rail">
          <section className="pva-block">
            <h2>Chủ đề</h2>
            <ul className="pva-topics">
              {topics.map((topic) => (
                <li key={topic.name}>
                  <Link href="/feed">
                    <span>{topic.name}</span>
                    <span className="pva-num">{topic.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="pva-block">
            <h2>Món đang được nhắc</h2>
            <ul className="pva-mini">
              {posts.slice(0, 3).map((post) => {
                const product = productById(post.products[0]);
                return (
                  <li key={product.id}>
                    <Link href="/search">
                      <Shot tone={product.tone} ratio="1/1" />
                      <span>
                        <strong>{product.name}</strong>
                        <em>{money(product.price)}</em>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="pva-block">
            <h2>Nhà bán có người kể</h2>
            <ul className="pva-shops">
              {shops.map((shop) => (
                <li key={shop.id}>
                  <strong>{shop.name}</strong>
                  <span>{shop.note}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <PreviewBar dir="a" view="feed" />
    </div>
  );
}
