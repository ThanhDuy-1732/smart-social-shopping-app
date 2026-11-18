import Link from "next/link";
import { orderLabels } from "@/modules/orders/labels";
export function OrderList({
  items,
}: {
  items: {
    id: string;
    shopName: string;
    status: string;
    total: string;
    createdAt: Date;
  }[];
}) {
  return (
    <div className="panel table-wrap">
      {items.length ? (
        <table>
          <thead>
            <tr>
              <th>Gian hàng / đơn</th>
              <th>Ngày đặt</th>
              <th>Tổng tiền</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/orders/${o.id}`}>{o.shopName}</Link>
                  <br />
                  <small className="break">{o.id}</small>
                </td>
                <td>
                  {o.createdAt.toLocaleString("vi-VN", {
                    timeZone: "Asia/Ho_Chi_Minh",
                  })}
                </td>
                <td>{BigInt(o.total).toLocaleString("vi-VN")} ₫</td>
                <td>
                  <span className="status">
                    {orderLabels[o.status] ?? o.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty">
          <h2>Chưa có đơn hàng</h2>
          <p className="muted">Các đơn hàng sẽ được hiển thị tại đây.</p>
        </div>
      )}
    </div>
  );
}
