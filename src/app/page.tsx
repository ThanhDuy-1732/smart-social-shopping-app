import Link from "next/link";
export default function Home() {
  return (
    <>
      <section className="hero">
        <div>
          <h1>Món đồ hay bắt đầu từ một lời chia sẻ.</h1>
          <p>
            Khám phá trải nghiệm của cộng đồng, tìm món phù hợp với nhu cầu và
            chia sẻ những gì bạn đang dùng.
          </p>
          <div className="hero-actions">
            <Link className="button" href="/register">
              Tham gia cộng đồng
            </Link>
            <Link className="button secondary" href="/seller/onboarding">
              Mở gian hàng
            </Link>
          </div>
        </div>
        <aside className="hero-note">
          <strong>“Món này dùng có ổn không?”</strong>
          <p>
            Một trải nghiệm thật có thể giúp người khác chọn dễ hơn. Cùng bắt
            đầu bằng câu chuyện của bạn.
          </p>
        </aside>
      </section>
      <section className="section">
        <h2>Mua sắm có thêm góc nhìn</h2>
        <div className="grid">
          <article className="panel">
            <h3>Nghe người đã dùng</h3>
            <p className="muted">
              Ảnh, video và câu chuyện từ trải nghiệm thường ngày.
            </p>
          </article>
          <article className="panel">
            <h3>Tìm theo điều bạn cần</h3>
            <p className="muted">
              Từ một chuyến đi đến góc làm việc mới, tìm sản phẩm theo nhu cầu
              của bạn.
            </p>
          </article>
          <article className="panel">
            <h3>Kết nối với nhà bán</h3>
            <p className="muted">
              Xem gian hàng và trao đổi trước khi quyết định mua.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
