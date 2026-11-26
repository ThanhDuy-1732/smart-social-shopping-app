import Link from "next/link";
import { Icon, PreviewBar, Shot } from "../_ui";
import {
  money,
  neighbours,
  posts,
  productById,
  products,
  topics,
} from "../_data";

export function FeedD() {
  const [lead, ...rest] = posts;
  const leadProduct = productById(lead.products[0]);
  const today = productById("may-xay");

  return (
    <div className="pv pv-d">
      <div className="pv-bg" aria-hidden="true" />

      <div className="pvd-shell">
        <div className="pvd-bar">
          <div className="pvd-seg" aria-label="Bảng tin">
            <Link href="/preview/d?view=feed" aria-current="page">
              Khám phá
            </Link>
            <Link href="/preview/d?view=feed">Theo dõi</Link>
            <Link href="/preview/d?view=feed">Đã lưu</Link>
          </div>
          <form className="pvd-find" action="/feed">
            <Icon name="search" size={17} />
            <input
              name="q"
              placeholder="Tìm bài viết, món đồ"
              aria-label="Tìm bài viết"
            />
          </form>
          <Link className="pvd-cta" href="/posts/new">
            Chia sẻ
          </Link>
        </div>

        <header className="pvd-intro">
          <h1>
            Người mua thật,
            <br />
            món dùng thật.
          </h1>
          <p>1.248 câu chuyện / cập nhật 8 phút trước</p>
        </header>

        <section className="pvd-hero">
          <article className="pvd-feature">
            <div className="pvd-feature-img">
              <Shot tone={lead.tone} ratio="16/9" />
              <span className="pvd-sticker">{lead.used}</span>
            </div>
            <div className="pvd-feature-body">
              <div className="pvd-author">
                <span className="pvd-ava">{lead.initial}</span>
                <p>
                  <strong>{lead.author}</strong>
                  <span>{lead.when}</span>
                </p>
              </div>
              <h2>
                <Link href="/posts/post-1">{lead.title}</Link>
              </h2>
              <div className="pvd-ticket">
                <div className="pvd-line">
                  <span>{leadProduct.name}</span>
                  <i aria-hidden="true" />
                  <b>{money(leadProduct.price)}</b>
                </div>
                <div className="pvd-line">
                  <span>{leadProduct.shop}</span>
                  <i aria-hidden="true" />
                  <b>còn {leadProduct.stock}</b>
                </div>
              </div>
              <div className="pvd-feature-foot">
                <button type="button" className="pvd-chip liked">
                  <Icon name="heart" size={14} />
                  {lead.likes}
                </button>
                <button type="button" className="pvd-chip">
                  <Icon name="bookmark" size={14} />
                  Lưu
                </button>
                <Link className="pvd-chip" href={`/posts/${lead.id}`}>
                  <Icon name="comment" size={14} />
                  {lead.comments}
                </Link>
                <span className="pvd-foot-note">Bài viết của người đã mua</span>
              </div>
            </div>
          </article>

          <div className="pvd-side">
            <section className="pvd-tile">
              <h3>Đang bàn</h3>
              <div className="pvd-tags">
                {topics.slice(0, 4).map((topic) => (
                  <Link key={topic.name} href="/feed">
                    {topic.name}
                    <b>{topic.count}</b>
                  </Link>
                ))}
              </div>
              <p className="pvd-tile-note">
                Chủ đề được nhắc nhiều trong 24 giờ qua.
              </p>
            </section>

            <section className="pvd-tile">
              <h3>Người bạn có thể theo</h3>
              <ul className="pvd-people">
                {neighbours.map((person) => (
                  <li key={person.name}>
                    <span className="pvd-ava small">{person.initial}</span>
                    <p>
                      <strong>{person.name}</strong>
                      <span>{person.note}</span>
                    </p>
                    <button type="button" className="pvd-follow">
                      Theo dõi
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <Link className="pvd-mini-ticket" href="/search">
              <span className="pvd-mini-label">Món hôm nay</span>
              <div className="pvd-mini-row">
                <Shot tone={today.tone} ratio="1/1" />
                <div>
                  <strong>{today.name}</strong>
                  <b>{money(today.price)}</b>
                </div>
              </div>
            </Link>

            <section className="pvd-price-slip">
              <span className="pvd-mini-label">Giá đang bán</span>
              <ul>
                {products.slice(0, 3).map((product) => (
                  <li key={product.id}>
                    <Link href="/search">
                      <span>{product.name}</span>
                      <b>{money(product.price)}</b>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link className="pvd-slip-link" href="/search">
                So sánh tất cả
              </Link>
            </section>
          </div>
        </section>

        <section className="pvd-feed">
          <div className="pvd-sec-head">
            <h2>Bài mới từ cộng đồng</h2>
            <p>6 bài trong 24 giờ</p>
          </div>
          <div className="pvd-cards">
            {rest.slice(0, 4).map((post) => {
              const product = productById(post.products[0]);
              return (
                <article className="pvd-card" key={post.id}>
                  <Link className="pvd-card-img" href={`/posts/${post.id}`}>
                    <Shot tone={post.tone} ratio="3/2" />
                    <span className="pvd-sticker">{post.used}</span>
                  </Link>
                  <div className="pvd-card-body">
                    <div className="pvd-author">
                      <span className="pvd-ava small">{post.initial}</span>
                      <p>
                        <strong>{post.author}</strong>
                        <span>{post.when}</span>
                      </p>
                    </div>
                    <h3>
                      <Link href={`/posts/${post.id}`}>{post.title}</Link>
                    </h3>
                    <p className="pvd-text">{post.text}</p>
                    <div className="pvd-receipt">
                      <div className="pvd-line">
                        <span>{product.name}</span>
                        <i aria-hidden="true" />
                        <b>{money(product.price)}</b>
                      </div>
                      <div className="pvd-line">
                        <span>{product.shop}</span>
                        <i aria-hidden="true" />
                        <b>{product.stock > 0 ? `còn ${product.stock}` : "hết hàng"}</b>
                      </div>
                    </div>
                    <div className="pvd-actions">
                      <button type="button" className="pvd-chip">
                        <Icon name="heart" size={14} />
                        {post.likes}
                      </button>
                      <button type="button" className="pvd-chip">Lưu</button>
                      <Link className="pvd-comments" href={`/posts/${post.id}`}>
                        Bình luận {post.comments}
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <PreviewBar dir="d" view="feed" />
    </div>
  );
}
