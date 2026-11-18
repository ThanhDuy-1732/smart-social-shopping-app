# Vận hành bản local

## Khởi động

1. Node 22.13+ (đã kiểm tra Node 24), PostgreSQL 18 và client `pg_dump`/`pg_restore` cùng major hoặc mới hơn server; FFmpeg cho video.
2. `npm ci`; `npm run db:local` nếu dùng cluster Unix socket của dự án, hoặc cấu hình PostgreSQL riêng trong `.env.local`.
3. `npm run db:migrate`; `npm run dev` tại http://127.0.0.1:14388; terminal khác chạy `npm run worker`.
4. `/api/health` chỉ xác nhận DB đáp ứng. Đây không phải xác nhận payment/AI/media/email/push đã sẵn sàng production.

Không có tài khoản/mật khẩu mẫu. Đăng ký, đọc thư xác minh trong `.local/mail`, đăng nhập, bật MFA rồi dùng `npm run admin:grant -- email-cua-ban` để cấp Admin đầu tiên. Email local và DB/media nằm trong `.local/`, không đưa lên Git. Không có trang inbox thư công khai.

Admin công bố chính sách, tạo danh mục/thuộc tính, duyệt shop/sản phẩm. Shop khai phí giao hàng và tự đóng gói/giao. Không có phí, sản phẩm hay doanh số giả được seed vào database sử dụng.

## Sao lưu và khôi phục

`npm run db:backup` tạo backup PostgreSQL custom trong `.local/backups`, file mode 600. Cần `PG_DUMP_PATH` nếu client không nằm trong PATH. Script tự nhận bộ client 18 đã build trong `.local/pg-client-build/postgresql-18.0/src/bin/pg_dump` của máy triển khai local này. Client 16 không dump được server 18.

Bản local một máy **không có backup ngoài máy, mã hóa backup, lịch lưu giữ hoặc PITR**. Các khả năng này phải được cấu hình tại hạ tầng thật trước mở bán. Backup DB không bao gồm nội dung file media: cần sao lưu cùng `.local/storage` khi worker dừng ghi; production phải dùng kho bền vững có chính sách backup riêng. Thư xác minh local chỉ phục vụ phát triển, không phải bản sao email production.

Kiểm thử `tests/integration/recovery.test.ts` tạo backup thật từ DB `_test`, restore bằng `pg_restore --exit-on-error` vào database ngẫu nhiên `recovery_*_restore_test`, kiểm tra đơn đã thanh toán, schema, thông báo và cân bằng sổ rồi xóa đúng database thử đó. Không restore đè database nguồn. Script tự động từ chối mọi đích khác mẫu recovery thử.

Khôi phục production phải theo nhà cung cấp DB đã chọn: dừng ghi/checkout/payout, lưu bản sao hiện trạng, restore vào database **mới**, đối chiếu tổng tiền và tham chiếu payment với provider, kiểm tra media/quyền/phiên rồi mới chuyển kết nối. Không dùng migration ngược hoặc xóa bút toán để sửa tiền. Chưa diễn tập production/PITR.

## Sự cố tiền và đối soát

Đặt `CHECKOUT_PAUSED=true` hoặc `PAYOUT_PAUSED=true` trong môi trường rồi khởi động lại web/worker liên quan. Checkout pause chặn đơn mới; payout pause chặn lập, duyệt và ghi nhận chi trả. Hủy đợt đối soát và xử lý nghĩa vụ đã phát sinh vẫn phải được thực hiện theo quyền. Không tắt nhận kết quả thanh toán đã phát sinh khi chỉ muốn dừng bán.

Xem `/admin/payments`, `/admin/disputes`, `/admin/settlements`, `/admin/reports`. Đối chiếu receipt/refund/payout theo mã sự kiện; tổng bút toán mỗi giao dịch phải bằng 0. Phí tính trên tiền hàng sau hoàn, không gồm giao hàng, làm tròn half-up đến VND. Đối soát chờ hết cả cửa sổ đổi trả và thời gian giữ tiền, loại đơn còn khiếu nại. Chi trả thủ công cần bằng chứng và mã chuyển khoản; ứng dụng không tự chuyển tiền.

Hoàn cho đơn đã được dành tiền đối soát cần hủy đợt trước. Hoàn sau khi đã chi trả bị chặn đến khi có quy trình thu hồi/nguồn bù được phê duyệt; chưa có quy trình này trong bản local. Payment/refund bên ngoài hiện fail closed vì chưa có provider; tuyệt đối không dùng fixture test để ghi nhận tiền khách.

## Worker, email và push

Worker lưu lease/job trong PostgreSQL. Khi dừng đột ngột, job hết lease có thể được nhận lại; retry tối đa 3 lần. Xem tác vụ lỗi tại `/admin/jobs`; không reset toàn bộ job hoặc xóa lịch sử. Media lỗi cần tải lại tệp hợp lệ; timeout video 30 giây và độ dài xuất tối đa 120 giây là giới hạn local.

Thông báo và email giao dịch được ghi trong cùng transaction nghiệp vụ. Email local dùng ID ổn định để không tạo nhiều file khi retry. Resend có khóa idempotency nhưng chưa được thử thật. Email có lần thử quá cũ chuyển `needs_review`; không tự gửi lại sau cửa sổ an toàn. Thư xác minh/reset được gửi đồng bộ để báo lỗi vận chuyển ngay.

Push cần VAPID public/private keys và contact thật (`VAPID_SUBJECT=mailto:...`). Có thể tạo bằng `npx web-push generate-vapid-keys`; lưu khóa riêng vào secret store, không chat/Git. UI chỉ hỏi quyền khi người dùng bấm bật. Đăng ký gắn với session và tự xóa ở DB khi session bị thu hồi/đăng xuất; worker loại session hết hạn. Payload chỉ chứa cập nhật chung; retry có thể hiển thị lại thông báo chung, cùng tag sẽ thay thế. Chưa thử giao nhận thật trên thiết bị.

## Quyền và dữ liệu riêng

Các dịch vụ đọc quyền từ DB; staff phải có MFA. Kiểm duyệt chỉ có quyền đọc từng tin nhắn được báo cáo, không có trình xem toàn bộ chat. Media riêng kiểm tra quyền tại mỗi lượt đọc; staff đọc bằng chứng có audit. Private layouts ẩn khi rời/trở lại trang và xác minh lại danh tính; service worker không cache API/HTML/media hoặc phát lại mutation.

## Kiểm tra trước phát hành

`npm test`, `npm run typecheck`, `npm run build`, `npm run test:e2e`. E2E dùng port 14387 và DB `_test`, tách khỏi dữ liệu local. CI workflow đã được chuẩn bị tại `.github/workflows/checks.yml`; chưa có remote/run hosted để xác nhận CI xanh.

Chưa có mức tải, RPO/RTO, dung lượng media hay ngân sách được chủ sản phẩm chốt. Không diễn giải kiểm thử đồng thời trong suite thành cam kết chịu tải production. Cần nghiệm thu theo cấu hình/nhà cung cấp thật sau khi chốt các mức này.
