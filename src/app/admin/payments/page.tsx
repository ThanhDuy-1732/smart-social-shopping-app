import { pageActor } from "@/server/page-access";
import { db } from "@/server/db";
export default async function Payments() {
  await pageActor("finance.manage");
  const rows = (
    await db.query(
      "SELECT p.id,p.checkout_id,p.amount::text,p.status,e.reason FROM payment_intent p LEFT JOIN payment_exception e ON e.checkout_id=p.checkout_id ORDER BY p.created_at DESC LIMIT 100",
    )
  ).rows;
  return (
    <>
      <h1>Thanh toán và khoản cần xử lý</h1>
      <p className="notice">
        Chưa kết nối cổng thanh toán. Dữ liệu thử nghiệm chỉ nằm trong môi
        trường kiểm thử, không đại diện giao dịch thật.
      </p>
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Mã thanh toán</th>
              <th>Số tiền</th>
              <th>Trạng thái</th>
              <th>Cần xử lý</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="break">{r.id}</td>
                <td>{BigInt(r.amount).toLocaleString("vi-VN")} ₫</td>
                <td>{r.status}</td>
                <td>
                  {r.reason === "CannotFulfillPaidOrder"
                    ? "Đã nhận tiền nhưng không thể cấp hàng; cần hoàn tiền"
                    : (r.reason ?? "—")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="muted">Chưa có yêu cầu thanh toán.</p>}
      </div>
    </>
  );
}
