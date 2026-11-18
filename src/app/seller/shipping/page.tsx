import { redirect } from "next/navigation";
import { pageActor } from "@/server/page-access";
import { getOwnShop } from "@/modules/shops/service";
import { listShippingRates } from "@/modules/shipping/service";
import { ActionForm } from "@/components/action-form";
import { saveShipping } from "./actions";
export default async function Shipping() {
  const actor = await pageActor();
  const shop = await getOwnShop(actor);
  if (shop?.status !== "approved") redirect("/seller");
  const rates = await listShippingRates(actor, shop.id);
  return (
    <>
      <h1>Phí và khu vực giao hàng</h1>
      <p className="muted">
        Shop tự đặt vận chuyển. Phí theo tỉnh/thành được ưu tiên hơn mức toàn
        quốc; khách xem được phí trước khi đặt hàng.
      </p>
      <div className="two-col">
        <section className="panel">
          <h2>Mức phí hiện tại</h2>
          {rates.length ? (
            <table>
              <thead>
                <tr>
                  <th>Khu vực</th>
                  <th>Phí</th>
                  <th>Dự kiến</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((r) => (
                  <tr key={r.region}>
                    <td>{r.region === "*" ? "Toàn quốc" : r.region}</td>
                    <td>{BigInt(r.fee).toLocaleString("vi-VN")} ₫</td>
                    <td>{r.estimatedDays} ngày</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">
              Chưa có phí giao hàng. Khách chỉ đặt được hàng khi có mức phí cho
              khu vực nhận.
            </p>
          )}
        </section>
        <section className="panel">
          <h2>Thêm hoặc cập nhật mức phí</h2>
          <ActionForm action={saveShipping} submitLabel="Lưu phí giao hàng">
            <input type="hidden" name="shopId" value={shop.id} />
            <label>
              Tỉnh/thành
              <input
                name="region"
                maxLength={100}
                placeholder="Ví dụ: Hà Nội"
              />
            </label>
            <label className="inline-check">
              <input type="checkbox" name="nationwide" value="yes" />
              Áp dụng toàn quốc
            </label>
            <label>
              Phí giao hàng (VND)
              <input
                name="fee"
                inputMode="numeric"
                pattern="[0-9]+"
                maxLength={13}
                required
              />
            </label>
            <label>
              Số ngày giao dự kiến
              <input
                name="estimatedDays"
                type="number"
                min={1}
                max={60}
                step={1}
                required
              />
            </label>
          </ActionForm>
        </section>
      </div>
    </>
  );
}
