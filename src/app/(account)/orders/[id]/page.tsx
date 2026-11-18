import Link from "next/link";
import { ReceiptVerificationForm } from "@/components/receipt-verification-form";
import { getAllowedPermissions } from "@/modules/access/service";
import { notFound } from "next/navigation";
import { pageActor } from "@/server/page-access";
import { getOrder } from "@/modules/orders/service";
import { orderLabels, returnLabels } from "@/modules/orders/labels";
import { DomainError } from "@/modules/shared/types";
import { ActionForm } from "@/components/action-form";
import { ReturnRequestForm } from "@/components/return-request-form";
import { changeOrder, sendReview, sendReturnReply } from "../actions";
export default async function Order({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await pageActor();
  let order;
  try {
    order = await getOrder(actor, (await params).id);
  } catch (error) {
    if (error instanceof DomainError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  const allowed = await getAllowedPermissions(actor);
  const buyer = actor.userId === order.buyerId,
    owner = actor.userId === order.ownerId;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Đơn tại {order.shopName}</h1>
          <p className="hint break">{order.id}</p>
        </div>
        <span className="status">
          {orderLabels[order.status] ?? order.status}
        </span>
      </div>
      {(buyer || owner) && (
        <Link
          className="button secondary"
          href={`/messages?peer=${buyer ? order.ownerId : order.buyerId}&kind=order&ref=${order.id}`}
        >
          {buyer ? "Nhắn shop" : "Nhắn người mua"}
        </Link>
      )}
      <div className="two-col">
        <section className="panel">
          <h2>Sản phẩm đã đặt</h2>
          {order.items.map((item) => (
            <div key={item.id} className="section">
              <h3>{item.name}</h3>
              <p>
                {item.label}
                <br />
                {item.quantity} ×{" "}
                {BigInt(item.unitPrice).toLocaleString("vi-VN")} ₫
              </p>
              {buyer && order.status === "received" && (
                <details>
                  <summary>Đánh giá trải nghiệm mua hàng</summary>
                  <ActionForm action={sendReview} submitLabel="Đăng đánh giá">
                    <input type="hidden" name="itemId" value={item.id} />
                    <input
                      type="hidden"
                      name="productId"
                      value={item.productId}
                    />
                    <label>
                      Điểm đánh giá
                      <select name="rating" aria-label="Điểm đánh giá">
                        <option value="5">5 sao</option>
                        <option value="4">4 sao</option>
                        <option value="3">3 sao</option>
                        <option value="2">2 sao</option>
                        <option value="1">1 sao</option>
                      </select>
                    </label>
                    <label>
                      Trải nghiệm của bạn
                      <textarea
                        name="text"
                        minLength={3}
                        maxLength={2000}
                        required
                      />
                    </label>
                  </ActionForm>
                </details>
              )}
            </div>
          ))}
          <p>
            Tiền hàng: {BigInt(order.subtotal).toLocaleString("vi-VN")} ₫<br />
            Phí giao: {BigInt(order.shipping).toLocaleString("vi-VN")} ₫<br />
            Đã hoàn: {BigInt(order.refundedAmount).toLocaleString("vi-VN")} ₫
          </p>
          <h2>Địa chỉ nhận hàng</h2>
          <p>
            {order.address.name} · {order.address.phone}
            <br />
            {order.address.line}
            <br />
            {order.address.region}
          </p>
          {order.trackingCode && (
            <p className="notice">
              Đơn vị vận chuyển: {order.carrier}
              <br />
              Mã theo dõi: {order.trackingCode}
            </p>
          )}
        </section>
        <section className="panel" style={{ alignSelf: "start" }}>
          <h2>Cập nhật đơn</h2>
          {!buyer &&
            !owner &&
            allowed.includes("disputes.manage") &&
            order.status === "shipped" && (
              <ReceiptVerificationForm orderId={order.id} />
            )}
          {owner && order.status === "paid" && (
            <ActionForm
              action={changeOrder}
              submitLabel="Xác nhận chuẩn bị hàng"
            >
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="type" value="accept" />
            </ActionForm>
          )}
          {owner && order.status === "accepted" && (
            <ActionForm action={changeOrder} submitLabel="Xác nhận đã gửi hàng">
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="type" value="ship" />
              <label>
                Đơn vị vận chuyển
                <input name="carrier" minLength={2} maxLength={80} required />
              </label>
              <label>
                Mã theo dõi
                <input
                  name="trackingCode"
                  minLength={2}
                  maxLength={100}
                  required
                />
              </label>
            </ActionForm>
          )}
          {buyer && order.status === "shipped" && (
            <ActionForm action={changeOrder} submitLabel="Tôi đã nhận hàng">
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="type" value="receive" />
              <p>
                Chỉ xác nhận khi bạn đã nhận được hàng. Mã theo dõi do shop cung
                cấp chưa tự xác nhận giao hàng thành công.
              </p>
            </ActionForm>
          )}
          {((buyer && ["awaiting_payment", "paid"].includes(order.status)) ||
            (owner && ["paid", "accepted"].includes(order.status))) && (
            <details className="section">
              <summary>Yêu cầu hủy đơn</summary>
              <ActionForm
                action={changeOrder}
                submitLabel={
                  order.status === "awaiting_payment"
                    ? "Hủy toàn bộ đơn chưa thanh toán"
                    : "Hủy và tạo yêu cầu hoàn tiền"
                }
              >
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="type" value="cancel" />
                {order.status === "awaiting_payment" && (
                  <p>
                    Thao tác hủy tất cả phần đơn cùng lần đặt hàng chưa thanh
                    toán.
                  </p>
                )}
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
          {buyer &&
            [
              "paid",
              "accepted",
              "shipped",
              "received",
              "refund_required",
            ].includes(order.status) && (
              <details className="section">
                <summary>Gửi yêu cầu hỗ trợ / đổi trả</summary>
                <ReturnRequestForm orderId={order.id} items={order.items} />
              </details>
            )}
          {order.status === "awaiting_payment" && (
            <p className="notice">
              Đơn chưa được thanh toán. Shop chỉ bắt đầu chuẩn bị sau khi thanh
              toán được xác nhận.
            </p>
          )}
          {order.status === "received" && (
            <p className="notice success">
              Đã ghi nhận nhận hàng. Thời hạn đổi trả theo chính sách phiên bản{" "}
              {order.policy.version}.
            </p>
          )}
        </section>
      </div>
      <section className="section">
        <h2>Yêu cầu xử lý</h2>
        {order.cases.length ? (
          order.cases.map((c) => (
            <article className="panel section" key={c.id}>
              <span className="status">
                {returnLabels[c.status] ?? c.status}
              </span>
              <p>{c.reason}</p>
              <div className="row">
                {c.evidenceIds.map((id) => (
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
              <p>
                Đề nghị xem xét:{" "}
                {(
                  BigInt(c.requestedItemsAmount) +
                  BigInt(c.requestedShippingAmount)
                ).toLocaleString("vi-VN")}{" "}
                ₫
                {c.refundAmount && (
                  <>
                    <br />
                    Khoản được duyệt:{" "}
                    {BigInt(c.refundAmount).toLocaleString("vi-VN")} ₫
                  </>
                )}
              </p>
              {c.sellerReply && (
                <p className="notice">
                  <strong>Shop phản hồi:</strong> {c.sellerReply}
                </p>
              )}
              {owner && ["open", "refund_pending"].includes(c.status) && (
                <ActionForm action={sendReturnReply} submitLabel="Gửi phản hồi">
                  <input type="hidden" name="caseId" value={c.id} />
                  <input type="hidden" name="orderId" value={order.id} />
                  <label>
                    Phản hồi của shop
                    <textarea
                      name="text"
                      minLength={10}
                      maxLength={2000}
                      defaultValue={c.sellerReply ?? ""}
                      required
                    />
                  </label>
                </ActionForm>
              )}
              {c.refundStatus === "pending" && (
                <p className="notice">
                  Khoản hoàn đang chờ xử lý, chưa xác nhận đã trả tiền.
                </p>
              )}
            </article>
          ))
        ) : (
          <p className="muted">Chưa có yêu cầu hỗ trợ hoặc đổi trả.</p>
        )}
      </section>
    </>
  );
}
