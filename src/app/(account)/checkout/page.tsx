import Link from "next/link";
import { randomUUID } from "node:crypto";
import { pageActor } from "@/server/page-access";
import { quoteCart } from "@/modules/checkout/service";
import { DomainError } from "@/modules/shared/types";
import { ActionForm } from "@/components/action-form";
import { placeOrder } from "./actions";
export default async function Checkout({
  searchParams,
}: {
  searchParams: Promise<{ region?: string }>;
}) {
  const actor = await pageActor();
  const { region } = await searchParams;
  let quote;
  try {
    quote = await quoteCart(actor, { region });
  } catch (error) {
    if (!(error instanceof DomainError)) throw error;
    return (
      <div className="panel">
        <h1>Kiểm tra giỏ hàng</h1>
        <p role="alert" className="notice error">
          {error.message}
        </p>
        <Link className="button" href="/cart">
          Về giỏ hàng
        </Link>
      </div>
    );
  }
  return (
    <>
      <h1>Xác nhận đặt hàng</h1>
      <div className="two-col">
        <section className="panel">
          <h2>Thông tin nhận hàng</h2>
          <ActionForm
            action={placeOrder}
            submitLabel="Tạo đơn và tiếp tục thanh toán"
          >
            <input type="hidden" name="quoteToken" value={quote.token} />
            <input type="hidden" name="requestKey" value={randomUUID()} />
            <input type="hidden" name="region" value={region} />
            <label>
              Họ tên người nhận
              <input
                name="name"
                minLength={2}
                maxLength={160}
                autoComplete="name"
                required
              />
            </label>
            <label>
              Số điện thoại
              <input
                name="phone"
                type="tel"
                maxLength={12}
                autoComplete="tel"
                required
              />
            </label>
            <p>Tỉnh/thành: {region}</p>
            <label>
              Địa chỉ chi tiết
              <input
                name="line"
                minLength={10}
                maxLength={500}
                autoComplete="street-address"
                required
              />
            </label>
            <p className="hint">
              Bằng việc đặt hàng, bạn đồng ý với{" "}
              <Link href="/terms">
                chính sách giao dịch phiên bản {quote.policy.version}
              </Link>
              . Hệ thống giữ hàng trong 15 phút để chờ thanh toán.
            </p>
          </ActionForm>
        </section>
        <section className="panel" style={{ alignSelf: "start" }}>
          <h2>Tổng tiền</h2>
          {quote.shops.map((shop) => (
            <div key={shop.shopId} className="section">
              <h3>{shop.shopName}</h3>
              {quote.lines
                .filter((x) => x.shopId === shop.shopId)
                .map((line) => (
                  <p key={line.variantId}>
                    {line.quantity} × {line.name} ({line.label})
                  </p>
                ))}
              <p>
                Tiền hàng: {BigInt(shop.subtotal).toLocaleString("vi-VN")} ₫
                <br />
                Giao hàng: {BigInt(shop.shipping).toLocaleString("vi-VN")} ₫
                <br />
                <small className="muted">
                  Dự kiến {shop.estimatedDays} ngày sau khi shop gửi hàng.
                </small>
              </p>
            </div>
          ))}
          <p className="metric">
            {BigInt(quote.total).toLocaleString("vi-VN")} ₫
          </p>
          <p className="hint">Đã bao gồm phí giao hàng của từng shop.</p>
        </section>
      </div>
    </>
  );
}
