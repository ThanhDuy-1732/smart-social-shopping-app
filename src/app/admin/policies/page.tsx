import Link from "next/link";
import { pageActor } from "@/server/page-access";
import { getActivePolicy } from "@/modules/policies/service";
import { DomainError } from "@/modules/shared/types";
import { ActionForm } from "@/components/action-form";
import { submitPolicy } from "./actions";
export default async function Policies() {
  await pageActor("policies.manage");
  let policy;
  try {
    policy = await getActivePolicy();
  } catch (error) {
    if (!(error instanceof DomainError)) throw error;
  }
  return (
    <>
      <h1>Chính sách giao dịch</h1>
      <p className="notice">
        Phí tính trên tiền hàng sau hoàn, không gồm giao hàng, làm tròn half-up
        đến VND. Đối soát chờ hết cả thời hạn đổi trả và thời gian giữ tiền.
      </p>
      <p className="muted">
        Mỗi lần công bố tạo một phiên bản mới. Cần hoàn tất chính sách trước khi
        mở bán và thu tiền thật.
      </p>
      {policy ? (
        <p className="notice">
          Đang áp dụng phiên bản {policy.version}.{" "}
          <Link href="/terms">Xem bản công khai</Link>
        </p>
      ) : (
        <p className="notice">Chưa có chính sách được công bố.</p>
      )}
      <div className="panel" style={{ maxWidth: 800 }}>
        <ActionForm action={submitPolicy} submitLabel="Công bố chính sách mới">
          <div className="two-col">
            <label>
              Phí nền tảng (điểm cơ bản)
              <input
                type="number"
                name="commissionBps"
                min={0}
                max={10000}
                step={1}
                defaultValue={policy?.commissionBps}
                required
              />
              <span className="hint">
                100 điểm = 1%. Điền mức đã thỏa thuận với shop.
              </span>
            </label>
            <label>
              Thời hạn shop xác nhận đơn (giờ)
              <input
                type="number"
                name="sellerAcceptHours"
                min={1}
                max={168}
                step={1}
                defaultValue={policy?.sellerAcceptHours}
                required
              />
            </label>
            <label>
              Thời hạn yêu cầu đổi trả (ngày)
              <input
                type="number"
                name="returnDays"
                min={0}
                max={365}
                step={1}
                defaultValue={policy?.returnDays}
                required
              />
            </label>
            <label>
              Thời gian chờ đối soát sau nhận hàng (ngày)
              <input
                type="number"
                name="settlementHoldDays"
                min={0}
                max={365}
                step={1}
                defaultValue={policy?.settlementHoldDays}
                required
              />
            </label>
          </div>
          <label>
            Điều kiện hủy đơn
            <textarea
              name="cancellationTerms"
              minLength={10}
              maxLength={10000}
              defaultValue={policy?.cancellationTerms}
              required
            />
          </label>
          <label>
            Điều kiện đổi trả / hoàn tiền
            <textarea
              name="returnTerms"
              minLength={10}
              maxLength={10000}
              defaultValue={policy?.returnTerms}
              required
            />
          </label>
          <label>
            Cách xác nhận giao hàng thành công
            <textarea
              name="receiptTerms"
              minLength={10}
              maxLength={10000}
              defaultValue={policy?.receiptTerms}
              required
            />
          </label>
          <p className="hint">
            Shop tự đánh dấu đã giao không phải bằng chứng đủ để chi trả. Cần
            khách xác nhận hoặc hỗ trợ xác minh.
          </p>
          <label>
            Quy định giao hàng và phí vận chuyển
            <textarea
              name="shippingTerms"
              minLength={10}
              maxLength={10000}
              defaultValue={policy?.shippingTerms}
              required
            />
          </label>
        </ActionForm>
      </div>
    </>
  );
}
