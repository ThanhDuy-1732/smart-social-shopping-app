import Link from "next/link";
import { pageActor } from "@/server/page-access";
export default async function Admin() {
  await pageActor("users.manage");
  return (
    <>
      <h1>Quản trị nền tảng</h1>
      <p className="muted">
        Quản lý tài khoản, duyệt nhà bán và thiết lập chính sách trước khi mở
        bán.
      </p>
      <div className="grid">
        <Link className="panel" href="/admin/users">
          <h2>Người dùng</h2>
          <p>Cấp quyền, thu hồi quyền và trạng thái tài khoản.</p>
        </Link>
        <Link className="panel" href="/admin/shops">
          <h2>Nhà bán</h2>
          <p>Xem hồ sơ và duyệt gian hàng.</p>
        </Link>
        <Link className="panel" href="/admin/policies">
          <h2>Chính sách</h2>
          <p>Thiết lập phí và điều kiện giao dịch.</p>
        </Link>
      </div>
    </>
  );
}
