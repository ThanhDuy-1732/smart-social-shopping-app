"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="panel">
      <h1>Chưa tải được nội dung</h1>
      <p>
        Vui lòng thử lại. Nếu vừa đặt hàng hoặc thanh toán, kiểm tra mục Đơn mua
        trước khi tạo đơn mới.
      </p>
      <button onClick={reset}>Thử lại</button>
    </section>
  );
}
