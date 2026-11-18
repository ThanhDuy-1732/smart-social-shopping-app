import Link from "next/link";
export default function NotFound() {
  return (
    <section className="panel">
      <h1>Không tìm thấy nội dung</h1>
      <p>
        Nội dung có thể đã được gỡ hoặc tài khoản của bạn chưa có quyền xem.
      </p>
      <Link className="button" href="/">
        Về trang chủ
      </Link>
    </section>
  );
}
