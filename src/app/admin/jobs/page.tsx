import { pageActor } from "@/server/page-access";
import { db } from "@/server/db";
export default async function Jobs() {
  await pageActor("users.manage");
  const rows = (
    await db.query(
      "SELECT id,kind,status,attempts,last_error,created_at FROM background_job ORDER BY created_at DESC LIMIT 100",
    )
  ).rows;
  return (
    <>
      <h1>Tác vụ nền</h1>
      <p className="muted">
        Theo dõi xử lý ảnh/video và các tác vụ bị gián đoạn. Các lần thử có giới
        hạn để tránh lặp vô hạn.
      </p>
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Loại</th>
              <th>Trạng thái</th>
              <th>Số lần thử</th>
              <th>Lỗi gần nhất</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.kind}</td>
                <td>{row.status}</td>
                <td>{row.attempts}</td>
                <td>{row.last_error ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="muted">Chưa có tác vụ.</p>}
      </div>
    </>
  );
}
