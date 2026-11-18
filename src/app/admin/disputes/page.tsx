import { getAllowedPermissions } from "@/modules/access/service";
import { redirect } from "next/navigation";
import { pageActor } from "@/server/page-access";
import { listReturnCases } from "@/modules/returns/service";
import { returnLabels } from "@/modules/orders/labels";
import { ActionForm } from "@/components/action-form";
import { decideReturn } from "./actions";
export default async function Disputes() {
  const actor = await pageActor();
  const allowed = await getAllowedPermissions(actor);
  if (
    !allowed.includes("disputes.manage") &&
    !allowed.includes("finance.manage")
  )
    redirect("/settings?access=denied");
  const cases = await listReturnCases(actor);
  return (
    <>
      <h1>Khiếu nại và hoàn tiền</h1>
      <p className="muted">
        Kiểm tra nội dung và bằng chứng trước khi quyết định. Duyệt hoàn tiền
        yêu cầu quyền tài chính.
      </p>
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Gian hàng / yêu cầu</th>
              <th>Số tiền đề nghị</th>
              <th>Trạng thái</th>
              <th>Xử lý</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.shopName}</strong>
                  <p>{c.reason}</p>
                  {c.sellerReply && (
                    <p>
                      <strong>Shop phản hồi:</strong> {c.sellerReply}
                    </p>
                  )}
                  {c.kind === "cancellation" && (
                    <p className="notice">
                      Khoản hoàn bắt buộc sau hủy đơn; không được từ chối nghĩa
                      vụ hoàn tiền.
                    </p>
                  )}
                  <div className="row">
                    {c.evidenceIds.map((id: string) => (
                      <a
                        key={id}
                        href={`/media/${id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Xem bằng chứng
                      </a>
                    ))}
                  </div>
                </td>
                <td>
                  {(
                    BigInt(c.requestedItemsAmount) +
                    BigInt(c.requestedShippingAmount)
                  ).toLocaleString("vi-VN")}{" "}
                  ₫
                </td>
                <td>
                  {returnLabels[c.status] ?? c.status}
                  {c.refundAmount && (
                    <p>
                      {BigInt(c.refundAmount).toLocaleString("vi-VN")} ₫ ·{" "}
                      {c.refundStatus === "succeeded"
                        ? "Đã hoàn"
                        : "Chưa xác nhận hoàn"}
                    </p>
                  )}
                </td>
                <td>
                  {c.status === "open" &&
                    (allowed.includes("finance.manage") ||
                      c.kind !== "cancellation") && (
                      <ActionForm
                        action={decideReturn}
                        submitLabel="Lưu quyết định"
                      >
                        <input type="hidden" name="caseId" value={c.id} />
                        <input type="hidden" name="orderId" value={c.orderId} />
                        <label>
                          Quyết định
                          <select name="decision" aria-label="Quyết định">
                            {allowed.includes("finance.manage") && (
                              <option value="approve">Duyệt hoàn tiền</option>
                            )}
                            {allowed.includes("disputes.manage") &&
                              c.kind !== "cancellation" && (
                                <option value="reject">Không chấp thuận</option>
                              )}
                          </select>
                        </label>
                        <label>
                          Số tiền hoàn (VND)
                          <input
                            name="amount"
                            inputMode="numeric"
                            pattern="[0-9]*"
                          />
                        </label>
                        <label>
                          Lý do nếu không chấp thuận
                          <textarea name="reason" maxLength={2000} />
                        </label>
                      </ActionForm>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!cases.length && <p className="muted">Chưa có yêu cầu cần xử lý.</p>}
      </div>
    </>
  );
}
