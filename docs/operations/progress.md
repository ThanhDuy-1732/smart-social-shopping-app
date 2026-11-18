# Tiến độ triển khai

- Phase 1 — nền dự án, tài khoản, quyền, duyệt shop (Tasks 1–3): hoàn tất local.
- Phase 2 — danh mục/sản phẩm và media (Tasks 4–5): hoàn tất local; cloud media còn chờ.
- Phase 3 — giỏ hàng, đơn, thanh toán và đối soát (Tasks 6–9): hoàn tất nghiệp vụ local; cổng thanh toán/hoàn tiền còn chờ.
- Phase 4 — Social, kiểm duyệt, chat và AI (Tasks 10–13): đang thực hiện.
- Phase 5 — PWA, báo cáo, vận hành và nghiệm thu (Tasks 14–16): chưa thực hiện.

## Bằng chứng

Task 1: health + rollback integration tests 3/3 pass, typecheck pass, production build pass. DB thử và DB local tách riêng, PostgreSQL 18.6 chạy qua Unix socket riêng.

## Phụ thuộc ngoài

Chưa có credentials, tài khoản dịch vụ hoặc hợp đồng thanh toán. Khảo sát provider không đồng nghĩa đã kiểm chứng sandbox. Không tự mua dịch vụ hoặc mở bán thật.

## Lưu ý tooling

`npm audit` sau khi cập nhật Zod còn 5 cảnh báo high theo chuỗi picomatch → fdir/tinyglobby → vite/vitest. Đây là công cụ kiểm thử/build, không phải dependency chạy ứng dụng production; npm hiện không cung cấp bản sửa tương thích qua audit fix. Không dùng audit fix --force để hạ version lớn tùy tiện. Cần kiểm tra lại trước phát hành.

Phase 1: 17 integration tests pass; 2 browser E2E tests pass (đăng ký/xác minh/login, MFA, quyền Admin, đăng ký/duyệt shop, logout, form mobile). Typecheck và production build pass. Tích hợp email thực chưa kiểm chứng.

Phase 2: danh mục/thuộc tính đa ngành, biến thể, duyệt sản phẩm, tìm kiếm tiếng Việt, sửa sản phẩm và upload ảnh/video local đã có. Worker dùng job/lease trong PostgreSQL. E2E đăng sản phẩm → duyệt → tìm và xem chi tiết đã pass. Upload cloud và sandbox provider còn chờ theo lựa chọn tiếp tục local của chủ sản phẩm.

Phase 3: giỏ/đơn nhiều shop, giữ kho nguyên tử, sự kiện thanh toán idempotent, giao nhận, bằng chứng riêng tư, hoàn một phần và sổ cân đối đã có kiểm thử. Đối soát theo tuần, duyệt và ghi nhận chuyển khoản thủ công; không có công cụ tự chuyển tiền. Live payment/refund provider và đối chiếu phí thực tế chưa kết nối.

Mốc cuối phase 3: 51 integration tests pass, typecheck pass, build pass. Luồng E2E tạo đơn local pass (không thu tiền thật). Hoàn sau khi đã chi trả shop cần quy trình nguồn bù/thu hồi trước production; hiện chặn thao tác để tránh ghi nhận sai tiền.

Chat local: hộp thư riêng, ảnh, thẻ sản phẩm/bài/đơn, trạng thái đọc, chống gửi trùng, chặn người dùng; SSE kiểm tra lại phiên và polling dự phòng. Kiểm duyệt chỉ xem từng tin đã bị báo cáo. Thông báo giao dịch và email qua worker/outbox; local không gửi email ra ngoài. E2E hai phiên gửi/đọc/reload/logout và chặn khách ngoài đã pass.
