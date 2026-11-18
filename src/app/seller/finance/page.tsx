import { redirect } from "next/navigation";
import { pageActor } from "@/server/page-access";
import { getOwnShop } from "@/modules/shops/service";
import { getShopFinancials, listSettlements } from "@/modules/finance/service";
export default async function Finance() {
  const actor = await pageActor(),
    shop = await getOwnShop(actor);
  if (!shop) redirect("/seller");
  const balance = await getShopFinancials(actor, shop.id),
    batches = await listSettlements(actor, shop.id);
  return (
    <>
      <h1>Doanh thu và đối soát</h1>
      <p className="muted">
        Khoản đủ điều kiện được đối soát hàng tuần. Phí nền tảng áp dụng trên
        tiền hàng, không tính trên phí giao; làm tròn đến đồng gần nhất.
      </p>
      <div className="grid">
        {Object.entries({
          pending: "Chờ đủ điều kiện",
          eligible: "Có thể đối soát",
          reserved: "Đã dành cho đợt chi trả",
          held: "Đang giữ để xử lý yêu cầu",
          paid: "Đã chi trả",
        }).map(([key, label]) => (
          <section className="panel" key={key}>
            <p className="muted">{label}</p>
            <p className="metric">
              {BigInt(balance[key as keyof typeof balance]).toLocaleString(
                "vi-VN",
              )}{" "}
              ₫
            </p>
          </section>
        ))}
      </div>
      <section className="panel section table-wrap">
        <h2>Lịch sử đối soát</h2>
        <table>
          <thead>
            <tr>
              <th>Tuần</th>
              <th>Số tiền</th>
              <th>Trạng thái</th>
              <th>Chuyển khoản</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.id}>
                <td>{b.period}</td>
                <td>{BigInt(b.amount).toLocaleString("vi-VN")} ₫</td>
                <td>
                  {{
                    prepared: "Chờ duyệt",
                    approved: "Chờ chuyển khoản",
                    paid: "Đã chi trả",
                    cancelled: "Đã hủy",
                  }[b.status as string] ?? b.status}
                </td>
                <td>
                  {b.bankReference ?? "—"}
                  {b.evidenceId && (
                    <p>
                      <a
                        href={`/media/${b.evidenceId}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Xem bằng chứng
                      </a>
                    </p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!batches.length && <p className="muted">Chưa có đợt đối soát.</p>}
      </section>
    </>
  );
}
