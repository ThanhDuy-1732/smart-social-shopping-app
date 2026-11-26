import Link from "next/link";
import { Icon, PreviewBar, Shot } from "../_ui";
import {
  money,
  neighbours,
  posts,
  productById,
  topics,
} from "../_data";

export function FeedB() {
  const [lead, ...rest] = posts;
  const leadProduct = productById(lead.products[0]);

  return (
    <div className="pv pv-b">
      <div className="pv-bg" aria-hidden="true" />

      <div className="pvb-shell">
        <div className="pvb-bar">
          <div className="pvb-seg" aria-label="Bảng tin">
            <Link href="/preview/b?view=feed" aria-current="page">
              Khám phá
            </Link>
            <Link href="/preview/b?view=feed">Theo dõi</Link>
            <Link href="/preview/b?view=feed">Đã lưu</Link>
          </div>
          <form className="pvb-find" action="/feed">
            <Icon name="search" size={17} />
            <input
              name="q"
              placeholder="Tìm bài viết, món đồ"
              aria-label="Tìm bài viết"
            />
          </form>
          <Link className="pvb-cta" href="/posts/new">
            Chia sẻ
          </Link>
        </div>

        <section className="pvb-hero">
          <article className="pvb-feature">
            <Shot tone={lead.tone} ratio="16/9" />
            <div className="pvb-feature-body">
              <div className="pvb-author">
                <span className="pvb-ava">{lead.initial}</span>
                <p>
                  <strong>{lead.author}</strong>
                  <span>{lead.when}</span>
                </p>
                <span className="pvb-chip">{lead.used}</span>
              </div>
              <h2>
                <Link href="/posts/post-1">{lead.title}</Link>
              </h2>
              <div className="pvb-feature-foot">
                <Link className="pvb-prod" href="/search">
                  <Shot tone={leadProduct.tone} ratio="1/1" />
                  <span>
                    <strong>{leadProduct.name}</strong>
                    <em>{money(leadProduct.price)}</em>
                  </span>
                </Link>
                <p className="pvb-stat">
                  <Icon name="heart" />
                  {lead.likes}
                  <Icon name="comment" />
                  {lead.comments}
                </p>
              </div>
            </div>
          </article>

          <div className="pvb-side">
            <section className="pvb-tile">
              <h3>Đang bàn</h3>
              <div className="pvb-chips">
                {topics.slice(0, 4).map((topic) => (
                  <Link key={topic.name} href="/feed">
                    #{topic.name}
                  </Link>
                ))}
              </div>
              <p className="pvb-tile-note">
                Chủ đề được nhắc nhiều trong 24 giờ qua.
              </p>
            </section>

            <section className="pvb-tile">
              <h3>Người bạn có thể theo</h3>
              <ul className="pvb-people">
                {neighbours.map((person) => (
                  <li key={person.name}>
                    <span className="pvb-ava small">{person.initial}</span>
                    <p>
                      <strong>{person.name}</strong>
                      <span>{person.note}</span>
                    </p>
                    <button type="button">Theo dõi</button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="pvb-tile">
              <h3>Món hôm nay</h3>
              <Link className="pvb-prod pvb-prod-tile" href="/search">
                <Shot tone={6} ratio="1/1" />
                <span>
                  <strong>Máy xay sinh tố 1,5 lít</strong>
                  <em>890.000 ₫</em>
                </span>
              </Link>
              <p className="pvb-tile-note">
                3 bài mới nhắc tới món này trong tuần.
              </p>
            </section>
          </div>
        </section>

        <section className="pvb-feed">
          <div className="pvb-sec-head">
            <h2>Bài mới từ cộng đồng</h2>
            <Link href="/feed">Xem tất cả</Link>
          </div>
          <div className="pvb-cards">
            {rest.slice(0, 4).map((post) => {
              const product = productById(post.products[0]);
              return (
                <article className="pvb-card" key={post.id}>
                  <Link className="pvb-card-img" href={`/posts/${post.id}`}>
                    <Shot tone={post.tone} ratio="3/2" />
                  </Link>
                  <div className="pvb-card-body">
                    <div className="pvb-author">
                      <span className="pvb-ava small">{post.initial}</span>
                      <p>
                        <strong>{post.author}</strong>
                        <span>{post.when}</span>
                      </p>
                    </div>
                    <h3>
                      <Link href={`/posts/${post.id}`}>{post.title}</Link>
                    </h3>
                    <p className="pvb-text">{post.text}</p>
                    <div className="pvb-card-foot">
                      <Link className="pvb-prod" href="/search">
                        <Shot tone={product.tone} ratio="1/1" />
                        <span>
                          <strong>{product.name}</strong>
                          <em>{money(product.price)}</em>
                        </span>
                      </Link>
                      <p className="pvb-stat">
                        <Icon name="heart" />
                        {post.likes}
                        <Icon name="comment" />
                        {post.comments}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <PreviewBar dir="b" view="feed" />
    </div>
  );
}
