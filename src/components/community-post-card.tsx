import Link from "next/link";
import { ActionForm } from "./action-form";
import { ReportForm } from "./report-form";
import { socialAction } from "@/app/(public)/feed/actions";
import type { PostCard as Post } from "@/modules/social/queries";

const money = (value: string) => `${BigInt(value).toLocaleString("vi-VN")} ₫`;

const when = (value: string) => {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
  }).formatToParts(date);
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const time = date.toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day}/${month} ${time}`;
};

const splitText = (text: string) => {
  const clean = text.trim();
  const match = clean.match(/^(.{20,120}?[.!?…])(\s+)([\s\S]{20,})$/);
  return match
    ? { title: match[1], body: match[3] }
    : { title: null, body: clean };
};

export function CommunityPostCard({
  post,
  signedIn,
  featured = false,
}: {
  post: Post;
  signedIn: boolean;
  featured?: boolean;
}) {
  const cover = post.media[0];
  const tag = post.topics[0];
  const { title, body } = splitText(post.text);

  return (
    <article className={featured ? "d-feature" : "d-card"}>
      {cover && (
        <div className="d-media">
          {cover.kind === "image" ? (
            <img
              src={`/media/${cover.id}`}
              alt="Ảnh trong bài chia sẻ"
              loading={featured ? "eager" : "lazy"}
            />
          ) : (
            <video
              src={`/media/${cover.id}`}
              controls
              preload="metadata"
              aria-label="Video trong bài chia sẻ"
            />
          )}
          {tag && <span className="d-sticker">#{tag}</span>}
          {post.media.length > 1 && (
            <span className="d-media-more">+{post.media.length - 1} tệp</span>
          )}
        </div>
      )}

      <div className={featured ? "d-feature-body" : "d-card-body"}>
        <div className="d-post-lead">
          <div className="d-author">
            <Link
              className="d-ava"
              href={`/users/${post.authorId}`}
              aria-label={`Hồ sơ của ${post.authorName}`}
            >
              {post.avatarId ? (
                <img src={`/media/${post.avatarId}`} alt="" />
              ) : (
                post.authorName.slice(0, 1)
              )}
            </Link>
            <p>
              <strong>
                <Link href={`/users/${post.authorId}`}>{post.authorName}</Link>
              </strong>
              <span>{when(post.createdAt)}</span>
            </p>
          </div>

          {title ? (
            <h2 className="d-post-title">
              <Link href={`/posts/${post.id}`}>{title}</Link>
            </h2>
          ) : null}

          <p
            className={`d-post-text ${
              featured ? "d-feature-text" : "d-card-text"
            }`}
          >
            {body}
          </p>

          {post.topics.length > 0 && (
            <p className="d-topics">
              {post.topics.slice(0, 3).map((topic) => (
                <Link key={topic} href={`/feed?q=${encodeURIComponent(topic)}`}>
                  #{topic}
                </Link>
              ))}
            </p>
          )}
        </div>

        <div className="d-post-foot">
          {post.products.length > 0 && (
            <div className="d-receipt" aria-label="Món đồ trong bài">
              {post.products.slice(0, 2).map((product) => (
                <div className="d-line" key={product.id}>
                  <span>
                    {product.available ? (
                      <Link href={`/products/${product.id}`}>
                        {product.name}
                      </Link>
                    ) : (
                      product.name
                    )}
                  </span>
                  <i aria-hidden="true" />
                  <b>{product.price ? money(product.price) : "—"}</b>
                </div>
              ))}
            </div>
          )}

          <div className="d-actions">
            {signedIn ? (
              <>
                <span className={post.liked ? "d-act liked" : "d-act"}>
                  <ActionForm
                    action={socialAction}
                    submitLabel={`${post.liked ? "Bỏ thích" : "Thích"} (${post.likes})`}
                  >
                    <input type="hidden" name="type" value="like" />
                    <input type="hidden" name="targetId" value={post.id} />
                    <input
                      type="hidden"
                      name="enabled"
                      value={String(!post.liked)}
                    />
                  </ActionForm>
                </span>
                <span className={post.saved ? "d-act liked" : "d-act"}>
                  <ActionForm
                    action={socialAction}
                    submitLabel={post.saved ? "Bỏ lưu" : "Lưu"}
                  >
                    <input type="hidden" name="type" value="save" />
                    <input type="hidden" name="targetId" value={post.id} />
                    <input
                      type="hidden"
                      name="enabled"
                      value={String(!post.saved)}
                    />
                  </ActionForm>
                </span>
              </>
            ) : (
              <Link className="d-act-link" href="/login">
                Đăng nhập để thích
              </Link>
            )}
            <Link className="d-comments" href={`/posts/${post.id}`}>
              Bình luận {post.commentCount}
            </Link>
          </div>

          {signedIn && (
            <div className="d-report">
              <ReportForm kind="post" targetId={post.id} />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
