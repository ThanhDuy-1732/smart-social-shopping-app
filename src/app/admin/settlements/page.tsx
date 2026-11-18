import { pageActor } from "@/server/page-access";
import { listFinanceShops, listSettlements } from "@/modules/finance/service";
import { ActionForm } from "@/components/action-form";
import { PayoutForm } from "@/components/payout-form";
import { prepareBatch, decideBatch } from "./actions";
const labels: Record<string, string> = {
  prepared: "Chờ duyệt",
  approved: "Đã duyệt, chờ chuyển khoản",
  paid: "Đã ghi nhận chi trả",
  cancelled: "Đã hủy",
};
export default async function Settlements() {
  const actor = await pageActor("finance.manage");
  const shops = await listFinanceShops(actor),
    batches = await listSettlements(actor);
  return (
    <>
      <h1>Đối soát và chi trả</h1>
      <p className="muted">
        Mỗi shop có tối đa một đợt chưa hủy trong mỗi tuần theo giờ Việt Nam.
        Chỉ chọn khoản đã qua thời hạn đổi trả và thời gian chờ đối soát.
      </p>
      <section className="panel section" style={{ maxWidth: 600 }}>
        <h2>Lập đợt đến thời điểm hiện tại</h2>
        {shops.length ? (
          <ActionForm action={prepareBatch} submitLabel="Lập đợt đối soát">
            <label>
              Gian hàng
              <select name="shopId" aria-label="Gian hàng">
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </ActionForm>
        ) : (
          <p>Chưa có gian hàng để đối soát.</p>
        )}
      </section>
      {batches.map((b) => (
        <article className="panel section" key={b.id}>
          <div className="page-heading">
            <div>
              <h2>{b.shopName}</h2>
              <p className="hint">
                Tuần bắt đầu {b.period} · {b.id}
              </p>
            </div>
            <span className="status">{labels[b.status]}</span>
          </div>
          <p className="metric">{BigInt(b.amount).toLocaleString("vi-VN")} ₫</p>
          <p>
            Tài khoản nhận: {b.beneficiary.bankName}
            <br />
            {b.beneficiary.bankAccount} · {b.beneficiary.bankHolder}
          </p>
          {b.bankReference && (
            <p>
              Mã chuyển khoản: {b.bankReference}{" "}
              {b.evidenceId && (
                <a
                  href={`/media/${b.evidenceId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Xem bằng chứng
                </a>
              )}
            </p>
          )}
          {b.status === "prepared" && (
            <ActionForm action={decideBatch} submitLabel="Duyệt đợt chi trả">
              <input type="hidden" name="settlementId" value={b.id} />
              <input type="hidden" name="decision" value="approve" />
            </ActionForm>
          )}
          {b.status === "approved" && <PayoutForm settlementId={b.id} />}{" "}
          {["prepared", "approved"].includes(b.status) && (
            <details className="section">
              <summary>Hủy đợt để xử lý lại</summary>
              <ActionForm action={decideBatch} submitLabel="Hủy đợt đối soát">
                <input type="hidden" name="settlementId" value={b.id} />
                <input type="hidden" name="decision" value="cancel" />
                <label>
                  Lý do hủy
                  <textarea
                    name="reason"
                    minLength={10}
                    maxLength={1000}
                    required
                  />
                </label>
              </ActionForm>
            </details>
          )}
        </article>
      ))}
      {!batches.length && <p className="muted">Chưa có đợt đối soát.</p>}
    </>
  );
}
