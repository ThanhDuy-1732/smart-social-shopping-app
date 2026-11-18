import Link from "next/link";
import { pageActor } from "@/server/page-access";
import { getOwnShop } from "@/modules/shops/service";
const statuses = {
  pending: "Đang xét duyệt",
  approved: "Đã được duyệt",
  rejected: "Cần bổ sung hồ sơ",
  suspended: "Gian hàng đang tạm khóa",
};
export default async function Seller() {
  const actor = await pageActor();
  const shop = await getOwnShop(actor);
  if (!shop)
    return (
      <section className="panel empty">
        <h1>Bắt đầu bán hàng cùng cộng đồng</h1>
        <p className="muted">
          Tạo hồ sơ gian hàng để chia sẻ sản phẩm và kết nối với người mua.
        </p>
        <Link className="button" href="/seller/onboarding">
          Đăng ký gian hàng
        </Link>
      </section>
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{shop.name}</h1>
          <span className="status">{statuses[shop.status]}</span>
          {shop.status === "approved" && (
            <p>
              <Link className="button" href="/seller/products">
                Quản lý sản phẩm
              </Link>
            </p>
          )}
        </div>
      </div>
      {shop.reviewReason && (
        <p className="notice">Kết quả xét duyệt: {shop.reviewReason}</p>
      )}
      {shop.status === "rejected" && (
        <Link className="button" href="/seller/onboarding">
          Bổ sung và gửi lại
        </Link>
      )}
      <div className="two-col section">
        <section className="panel">
          <h2>Thông tin gian hàng</h2>
          <p>{shop.description}</p>
          <p className="muted">
            {shop.phone}
            <br />
            {shop.address}
          </p>
        </section>
        <section className="panel">
          <h2>Tài khoản nhận tiền</h2>
          <p>
            {shop.bankName}
            <br />
            •••• {shop.bankAccount.slice(-4)}
            <br />
            {shop.bankHolder}
          </p>
          <p className="hint">
            Thông tin nhận tiền cần được xác minh khi thay đổi. Liên hệ bộ phận
            vận hành để cập nhật.
          </p>
        </section>
      </div>
      {shop.status === "pending" && (
        <p className="notice">
          Hồ sơ đang được xét duyệt. Gian hàng chỉ được mở bán sau khi được chấp
          thuận.
        </p>
      )}
    </>
  );
}
