import { getActivePolicy } from "@/modules/policies/service";
import { DomainError } from "@/modules/shared/types";
export const dynamic = "force-dynamic";
export default async function Terms() {
  let policy;
  try {
    policy = await getActivePolicy();
  } catch (error) {
    if (!(error instanceof DomainError)) throw error;
  }
  if (!policy)
    return (
      <div className="panel">
        <h1>Chính sách giao dịch</h1>
        <p>
          Chính sách chưa được công bố. Vui lòng quay lại trước khi đặt hàng.
        </p>
      </div>
    );
  return (
    <article className="panel" style={{ maxWidth: 850 }}>
      <h1>Chính sách giao dịch</h1>
      <p className="muted">Phiên bản {policy.version}</p>
      <h2>Phí và thời hạn</h2>
      <p>
        Phí nền tảng đối với nhà bán:{" "}
        {(policy.commissionBps / 100).toLocaleString("vi-VN")}%. Thời hạn shop
        xác nhận đơn: {policy.sellerAcceptHours} giờ. Yêu cầu đổi trả trong{" "}
        {policy.returnDays} ngày. Chờ đối soát sau nhận hàng:{" "}
        {policy.settlementHoldDays} ngày.
      </p>
      {[
        ["Hủy đơn", policy.cancellationTerms],
        ["Đổi trả và hoàn tiền", policy.returnTerms],
        ["Xác nhận nhận hàng", policy.receiptTerms],
        ["Giao hàng", policy.shippingTerms],
      ].map(([title, text]) => (
        <section key={title}>
          <h2>{title}</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{text}</p>
        </section>
      ))}
    </article>
  );
}
