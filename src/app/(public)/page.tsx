import Image from "next/image";
import Link from "next/link";
import { PostCard } from "@/components/post-card";
import { listFeed } from "@/modules/social/queries";
import { optionalActor } from "@/server/optional-actor";

const topics = [
  { name: "Du lịch", search: "du lịch" },
  { name: "Góc làm việc", search: "góc làm việc" },
  { name: "Chăm sóc bản thân", search: "chăm sóc bản thân" },
];

export default async function Home() {
  const actor = await optionalActor();
  const { items } = await listFeed(actor, { limit: 3 });

  return (
    <>
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="hero-kicker">Mua sắm cùng cộng đồng</p>
          <h1>Món hay từ người đã dùng.</h1>
          <p>
            Đọc trải nghiệm, xem món đồ trong đời thật và chọn thứ hợp với bạn.
          </p>
          <div className="hero-actions">
            <Link className="button" href="/feed">
              Khám phá cộng đồng
            </Link>
            <Link className="button secondary" href="/search">
              Xem sản phẩm
            </Link>
          </div>
        </div>
        <figure className="home-hero-photo">
          <Image
            src="/brand/weekend.webp"
            alt="Nhóm bạn đi chơi ở Đà Lạt với ba lô và bình giữ nhiệt"
            fill
            sizes="(max-width: 760px) 100vw, 620px"
            preload
          />
          <Link className="photo-link" href="/discover?q=Du+lịch+Đà+Lạt+2+ngày">
            <span>
              <small>Gợi ý theo chuyến đi</small>
              <strong>Đi Đà Lạt mang gì?</strong>
            </span>
            <span aria-hidden="true">↗</span>
          </Link>
        </figure>
      </section>
      <section className="home-feed" aria-labelledby="latest-posts">
        <div className="home-section-heading">
          <h2 id="latest-posts">Cộng đồng đang chia sẻ</h2>
          <Link href="/feed">
            Xem bảng tin <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <nav className="topic-strip" aria-label="Chủ đề cộng đồng">
          {topics.map((topic) => (
            <Link
              key={topic.search}
              href={`/feed?q=${encodeURIComponent(topic.search)}`}
            >
              {topic.name}
            </Link>
          ))}
        </nav>
        {items.length ? (
          <div className="home-post-grid">
            {items.map((post) => (
              <PostCard key={post.id} post={post} signedIn={Boolean(actor)} />
            ))}
          </div>
        ) : (
          <div className="home-empty panel">
            <div>
              <h3>Chia sẻ món bạn đang dùng</h3>
              <p>
                Đăng một ảnh, video hoặc vài dòng trải nghiệm về món đồ bạn
                thích.
              </p>
            </div>
            <Link
              className="button secondary"
              href={actor ? "/posts/new" : "/register"}
            >
              Viết bài chia sẻ
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
