import { pageActor } from "@/server/page-access";
import { listReports } from "@/modules/moderation/service";
import { ActionForm } from "@/components/action-form";
import { resolveReport } from "./actions";
const labels: Record<string, string> = {
  message: "Tin nhắn được báo cáo",
  post: "Bài chia sẻ",
  product: "Sản phẩm",
  comment: "Bình luận",
  review: "Đánh giá",
  shop: "Gian hàng",
  user: "Người dùng",
};
export default async function Moderation() {
  const actor = await pageActor();
  const reports = await listReports(actor);
  return (
    <>
      <h1>Báo cáo nội dung</h1>
      <p className="muted">
        Xem nội dung được báo cáo và ghi rõ lý do xử lý. Quyền xử lý tài
        khoản/gian hàng tách khỏi quyền kiểm duyệt bài viết.
      </p>
      {reports.length ? (
        reports.map((r) => (
          <article className="panel section" key={r.id}>
            <div className="page-heading">
              <h2>{labels[r.kind] ?? r.kind}</h2>
              <span className="status">
                {r.status === "open" ? "Chờ xử lý" : "Đã xử lý"}
              </span>
            </div>
            <p className="hint">
              Người báo cáo: {r.reporterName ?? "Tài khoản không còn hoạt động"}
            </p>
            <p>
              <strong>Lý do:</strong> {r.reason}
            </p>
            <blockquote className="notice post-text">
              {r.preview ?? "Nội dung không còn hiển thị."}
            </blockquote>
            {r.media?.length > 0 && (
              <div className="post-media">
                {r.media.map((m: { id: string; kind: string }) =>
                  m.kind === "image" ? (
                    <img
                      key={m.id}
                      src={`/media/${m.id}`}
                      alt="Ảnh trong nội dung được báo cáo"
                    />
                  ) : (
                    <video
                      key={m.id}
                      src={`/media/${m.id}`}
                      controls
                      aria-label="Video được báo cáo"
                    />
                  ),
                )}
              </div>
            )}
            {r.status === "open" ? (
              <ActionForm action={resolveReport} submitLabel="Lưu quyết định">
                <input type="hidden" name="reportId" value={r.id} />
                <label>
                  Quyết định
                  <select name="action" aria-label="Quyết định kiểm duyệt">
                    <option value="dismiss">Không xác nhận vi phạm</option>
                    <option value="hide">
                      Ẩn nội dung / tạm khóa theo loại báo cáo
                    </option>
                  </select>
                </label>
                <label>
                  Lý do xử lý
                  <textarea
                    name="reason"
                    minLength={10}
                    maxLength={2000}
                    required
                  />
                </label>
              </ActionForm>
            ) : (
              <p className="muted">Kết quả: {r.resolution}</p>
            )}
          </article>
        ))
      ) : (
        <div className="panel empty">
          <h2>Chưa có báo cáo cần xem xét</h2>
        </div>
      )}
    </>
  );
}
