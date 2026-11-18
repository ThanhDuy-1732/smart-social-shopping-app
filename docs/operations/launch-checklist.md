# Điều kiện mở bán — chưa triển khai production

## Đã có và đã kiểm tra local

- Tài khoản xác minh email, MFA staff, phân quyền và thu hồi quyền trong phiên.
- Đăng ký/duyệt shop, danh mục đa ngành, biến thể/tồn kho, duyệt sản phẩm và chính sách phiên bản.
- Xử lý ảnh/video thật ở local, Social gắn sản phẩm, theo dõi/chặn và báo cáo/kiểm duyệt.
- Giỏ nhiều shop, xác nhận giá/phí, giữ kho, đơn/giao nhận, hoàn một phần, sổ cân đối và đợt đối soát tuần.
- Chat riêng, ảnh/thẻ chia sẻ, SSE/polling, thông báo, email local qua worker.
- Gợi ý local theo mẫu/từ khóa và danh sách chuẩn bị; ngân sách là trần từng món.
- PWA, offline fallback an toàn, kiểm tra đổi tài khoản và lịch sử điều hướng; báo cáo/CSV theo quyền.
- Backup PostgreSQL và restore database thử riêng; kiểm tra nguồn gốc bút toán, retry và quyền qua suite.

## Còn chờ trước production

| Hạng mục | Cần hoàn tất |
|---|---|
| Thanh toán sàn | Chọn provider/hợp đồng cho thu hộ nhiều shop; sandbox/live credentials; ký/xác minh callback, hoàn một phần, chống thu trùng và đối chiếu phí/tiền thực |
| Hoàn sau payout | Chốt nguồn bù/thu hồi và quy trình xử lý ngoại lệ trước khi bỏ chặn |
| Media | Kho bền vững + upload/chuyển mã/CDN, quota/dung lượng, kiểm chứng lỗi và quyền URL |
| Email | Miền gửi xác minh, Resend key/sender, sandbox gửi/nhận và retry thực |
| AI | Chọn provider, structured intent, đánh giá tiếng Việt/ID bịa/prompt injection, timeout và giới hạn chi phí; hiện chưa có AI thật |
| Push/thiết bị | VAPID/contact thật, quyền cho phép/từ chối, giao nhận và logout trên Chrome Android/Safari iOS; cập nhật PWA trên máy thật |
| Hạ tầng | Hosting, DB production, secret store, HTTPS, ingress rate limits, nhật ký/giám sát và cảnh báo worker/payment |
| Khôi phục | Backup ngoài máy có mã hóa/retention, media backup, RPO/RTO và diễn tập production/PITR |
| Hiệu năng/chi phí | Chủ sản phẩm chốt tải đồng thời, lượng media/ngân sách; đo p95/tỷ lệ lỗi/chi phí trên hạ tầng thực |
| Vận hành | Người trực hỗ trợ/kiểm duyệt/tài chính; chính sách công bố và phạm vi ngành được phép bán tại Việt Nam |
| Phát hành | Remote/CI hosted xanh, chạy lại audit phụ thuộc; có 5 advisory high ở tooling Vitest/Vite chưa có bản sửa tương thích được xác nhận |

Không có credentials production trong test. Chưa thu tiền thật, chuyển tiền, gửi email/push ra ngoài hoặc tự publish website.
