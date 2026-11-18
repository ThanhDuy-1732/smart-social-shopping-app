import Link from "next/link";
import { pageActor } from "@/server/page-access";
import { getOwnShop } from "@/modules/shops/service";
import { ActionForm } from "@/components/action-form";
import { submitShop } from "./actions";
export default async function Onboarding() {
  const actor = await pageActor();
  const shop = await getOwnShop(actor);
  if (shop && shop.status !== "rejected")
    return (
      <div className="panel">
        <h1>Hồ sơ gian hàng đã được gửi</h1>
        <p>Vui lòng xem trạng thái xét duyệt và thông tin gian hàng.</p>
        <Link className="button" href="/seller">
          Gian hàng của tôi
        </Link>
      </div>
    );
  return (
    <>
      <h1>{shop ? "Bổ sung hồ sơ gian hàng" : "Mở gian hàng của bạn"}</h1>
      <p className="muted">
        Mỗi tài khoản có một gian hàng. Thông tin được dùng để xét duyệt và đối
        soát, không hiển thị công khai toàn bộ.
      </p>
      {shop?.reviewReason && (
        <p className="notice">Cần bổ sung: {shop.reviewReason}</p>
      )}
      <div className="panel" style={{ maxWidth: 760 }}>
        <ActionForm action={submitShop} submitLabel="Gửi hồ sơ xét duyệt">
          <h2>Thông tin gian hàng</h2>
          <label>
            Tên gian hàng
            <input
              name="name"
              defaultValue={shop?.name}
              minLength={2}
              maxLength={80}
              required
            />
          </label>
          <label>
            Giới thiệu
            <textarea
              name="description"
              defaultValue={shop?.description}
              minLength={10}
              maxLength={2000}
              required
            />
          </label>
          <div className="two-col">
            <label>
              Số điện thoại Việt Nam
              <input
                name="phone"
                type="tel"
                defaultValue={shop?.phone}
                placeholder="0901234567"
                maxLength={12}
                required
              />
            </label>
            <label>
              Họ tên cá nhân / tên pháp lý
              <input
                name="legalName"
                defaultValue={shop?.legalName}
                minLength={3}
                maxLength={160}
                required
              />
            </label>
          </div>
          <label>
            Địa chỉ gửi hàng
            <input
              name="address"
              autoComplete="street-address"
              defaultValue={shop?.address}
              minLength={10}
              maxLength={500}
              required
            />
          </label>
          <h2>Thông tin nhận tiền</h2>
          <p className="action-note">
            Đối soát hàng tuần, nền tảng duyệt chi trả. Hãy dùng tài khoản ngân
            hàng thuộc người hoặc đơn vị đã đăng ký.
          </p>
          <label>
            Ngân hàng
            <input
              name="bankName"
              defaultValue={shop?.bankName}
              minLength={3}
              maxLength={120}
              required
            />
          </label>
          <div className="two-col">
            <label>
              Số tài khoản
              <input
                name="bankAccount"
                inputMode="numeric"
                defaultValue={shop?.bankAccount}
                pattern="[0-9]{6,30}"
                maxLength={30}
                required
              />
            </label>
            <label>
              Tên chủ tài khoản
              <input
                name="bankHolder"
                defaultValue={shop?.bankHolder}
                minLength={3}
                maxLength={160}
                required
              />
            </label>
          </div>
        </ActionForm>
      </div>
    </>
  );
}
