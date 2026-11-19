import { ReportForm } from "./report-form";
import Link from "next/link";
import type { PostCard as Post } from "@/modules/social/queries";
import { ActionForm } from "./action-form";
import { socialAction } from "@/app/(public)/feed/actions";
export function PostCard({
  post,
  signedIn,
}: {
  post: Post;
  signedIn: boolean;
}) {
  return (
    <article className="panel social-card">
      <header className="row">
        <Link
          className="avatar"
          href={`/users/${post.authorId}`}
          aria-label={`Hồ sơ của ${post.authorName}`}
        >
          {post.avatarId ? (
            <img src={`/media/${post.avatarId}`} alt="" />
          ) : (
            post.authorName.slice(0, 1)
          )}
        </Link>
        <div>
          <Link href={`/users/${post.authorId}`}>
            <strong>{post.authorName}</strong>
          </Link>
          <p className="hint" style={{ margin: 0 }}>
            {new Date(post.createdAt).toLocaleString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
            })}
          </p>
        </div>
      </header>
      <p className="post-text">{post.text}</p>
      <div className="post-media">
        {post.media.map((m) =>
          m.kind === "image" ? (
            <img
              key={m.id}
              src={`/media/${m.id}`}
              alt="Ảnh trong bài chia sẻ"
              loading="lazy"
            />
          ) : (
            <video
              key={m.id}
              src={`/media/${m.id}`}
              controls
              preload="metadata"
              aria-label="Video trong bài chia sẻ"
            />
          ),
        )}
      </div>
      {post.products.length > 0 && (
        <div className="product-tags" aria-label="Món đồ trong bài">
          {post.products.map((p) =>
            p.available ? (
              <Link key={p.id} href={`/products/${p.id}`}>
                {p.coverId && (
                  <img src={`/media/${p.coverId}`} alt="" loading="lazy" />
                )}
                <div>
                  <strong>{p.name}</strong>
                  {p.price !== null && (
                    <small>
                      Từ {BigInt(p.price).toLocaleString("vi-VN")} ₫
                    </small>
                  )}
                </div>
              </Link>
            ) : (
              <span key={p.id} className="muted">
                Sản phẩm tạm ngừng bán
              </span>
            ),
          )}
        </div>
      )}
      <div className="row">
        {post.topics.map((t) => (
          <Link
            className="hint"
            key={t}
            href={`/feed?q=${encodeURIComponent(t)}`}
          >
            #{t}
          </Link>
        ))}
      </div>
      <div className="social-actions">
        {signedIn ? (
          <>
            <ActionForm
              action={socialAction}
              submitLabel={`${post.liked ? "Bỏ thích" : "Thích"} (${post.likes})`}
            >
              <input type="hidden" name="type" value="like" />
              <input type="hidden" name="targetId" value={post.id} />
              <input type="hidden" name="enabled" value={String(!post.liked)} />
            </ActionForm>
            <ActionForm
              action={socialAction}
              submitLabel={post.saved ? "Bỏ lưu" : "Lưu bài"}
            >
              <input type="hidden" name="type" value="save" />
              <input type="hidden" name="targetId" value={post.id} />
              <input type="hidden" name="enabled" value={String(!post.saved)} />
            </ActionForm>
          </>
        ) : (
          <Link href="/login">Đăng nhập để tương tác</Link>
        )}
        <Link href={`/posts/${post.id}`}>Bình luận ({post.commentCount})</Link>
      </div>
      {signedIn && <ReportForm kind="post" targetId={post.id} />}
    </article>
  );
}
