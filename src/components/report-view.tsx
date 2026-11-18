import type { DateRange, FinancialReport } from "@/modules/reporting/service";
const money = (v: string) => BigInt(v).toLocaleString("vi-VN") + " ₫";
export function ReportView({
  report,
  range,
  shopId,
}: {
  report: FinancialReport;
  range: DateRange;
  shopId?: string;
}) {
  const csv = new URLSearchParams({ ...range, ...(shopId ? { shopId } : {}) });
  return (
    <>
      <form className="panel row">
        <label>
          Từ ngày (Việt Nam)
          <input type="date" name="from" defaultValue={range.from} required />
        </label>
        <label>
          Đến hết ngày (Việt Nam)
          <input type="date" name="to" defaultValue={range.to} required />
        </label>
        <button>Xem báo cáo</button>
        <a className="button secondary" href={`/api/reports?${csv}`}>
          Tải CSV
        </a>
      </form>
      <div className="grid section">
        {[
          ["Tiền hàng từng thanh toán", report.paidGmv],
          ["Phí giao hàng từng thanh toán", report.paidShipping],
          ["Tiền thực ghi nhận thu", report.receipts],
          ["Tiền đã hoàn", report.refunds],
          ["Phí nền tảng ghi nhận", report.fees],
          ["Tiền đã trả shop", report.payouts],
          ["Biến động tiền ròng trong kỳ", report.netCash],
          ["Còn phải trả shop đến cuối kỳ", report.payable],
        ].map(([label, value]) => (
          <article className="panel" key={label}>
            <p className="hint">{label}</p>
            <strong className="metric">{money(value)}</strong>
          </article>
        ))}
      </div>
      <p className="notice">
        {report.paidOrders} đơn shop đã ghi nhận thanh toán trong kỳ. Doanh số
        tiền hàng không phải doanh thu phí. Phí được ghi nhận sau thời gian đổi
        trả/chờ đối soát; tiền thu, hoàn và chi trả lấy từ sổ bút toán. Số phải
        trả là số dư cộng dồn đến cuối ngày kết thúc, gồm tiền còn giữ.
      </p>
      <h2>Nguồn gần nhất trước khi tạo đơn</h2>
      <p className="muted">
        Chỉ ghi nguồn bài viết/gợi ý hợp lệ trong 7 ngày, có liên kết sản phẩm
        trong đơn; mỗi đơn shop ghi một nguồn. Đây là quy tắc ghi nhận, không
        chứng minh quan hệ nhân quả. “Trực tiếp” gồm các lượt không đủ dữ liệu
        nguồn.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nguồn</th>
              <th>Đơn đã thanh toán</th>
              <th>Tiền hàng</th>
            </tr>
          </thead>
          <tbody>
            {report.sources.map((s) => (
              <tr key={s.source}>
                <td>
                  {{
                    direct: "Trực tiếp / chưa xác định",
                    post: "Bài chia sẻ",
                    discovery: "Gợi ý local",
                  }[s.source] ?? s.source}
                </td>
                <td>{s.orders}</td>
                <td>{money(s.gmv)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!report.sources.length && <p>Chưa có đơn đã thanh toán trong kỳ.</p>}
      <h2>Biến động theo ngày Việt Nam</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ngày</th>
              <th>Tiền ròng</th>
              <th>Phí ghi nhận</th>
            </tr>
          </thead>
          <tbody>
            {report.daily.map((d) => (
              <tr key={d.day}>
                <td>{d.day}</td>
                <td>{money(d.cash)}</td>
                <td>{money(d.fees)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {report.activity && (
        <section className="panel section">
          <h2>Hoạt động trong nền tảng</h2>
          <p>
            {report.activity.activeUsers} người đã đăng nhập có hoạt động nội
            dung; {report.activity.postViews} lượt xem bài;{" "}
            {report.activity.productViews} lượt xem sản phẩm;{" "}
            {report.activity.discoveries} yêu cầu gợi ý local;{" "}
            {report.activity.emptySearches} lượt tìm/gợi ý không có sản phẩm.
          </p>
          <p className="hint">
            Lượt xem/tìm được gộp theo người, nội dung và ngày. Không đo khách
            ẩn danh hay mọi lượt ngoài nền tảng. Chưa sử dụng AI thật nên chưa
            phát sinh chi phí API AI; chưa có phép đo giá cho nhà cung cấp.
          </p>
        </section>
      )}
    </>
  );
}
