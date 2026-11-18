# Tiến độ triển khai

- Phase 1 — nền dự án, tài khoản, quyền, duyệt shop (Tasks 1–3): hoàn tất local.
- Phase 2 — danh mục/sản phẩm và media (Tasks 4–5): hoàn tất local; cloud media còn chờ.
- Phase 3 — giỏ hàng, đơn, thanh toán và đối soát (Tasks 6–9): hoàn tất nghiệp vụ local; cổng thanh toán/hoàn tiền còn chờ.
- Phase 4 — Social, kiểm duyệt, chat và gợi ý (Tasks 10–13): hoàn tất phạm vi local; AI thật còn chờ.
- Phase 5 — PWA, báo cáo, vận hành và nghiệm thu (Tasks 14–16): hoàn tất triển khai và nghiệm thu local; production còn các điều kiện bên dưới.

## Bằng chứng

Task 1: health + rollback integration tests 3/3 pass, typecheck pass, production build pass. DB thử và DB local tách riêng, PostgreSQL 18.6 chạy qua Unix socket riêng.

## Phụ thuộc ngoài

Chưa có credentials, tài khoản dịch vụ hoặc hợp đồng thanh toán. Khảo sát provider không đồng nghĩa đã kiểm chứng sandbox. Không tự mua dịch vụ hoặc mở bán thật.

## Lưu ý tooling

`npm audit` sau khi cập nhật Zod còn 5 cảnh báo high theo chuỗi picomatch → fdir/tinyglobby → vite/vitest. Chuỗi này thuộc công cụ kiểm thử/build nhưng Better Auth khai Vitest như optional peer, nên npm audit --omit=dev vẫn báo 5 high. Không được xem omit=dev là đã loại bỏ chúng; cần kiểm tra artifact/hình thức đóng gói production. Npm hiện không cung cấp bản sửa tương thích qua audit fix. Không dùng audit fix --force để hạ version lớn tùy tiện. Cần kiểm tra lại trước phát hành.

Phase 1: 17 integration tests pass; 2 browser E2E tests pass (đăng ký/xác minh/login, MFA, quyền Admin, đăng ký/duyệt shop, logout, form mobile). Typecheck và production build pass. Tích hợp email thực chưa kiểm chứng.

Phase 2: danh mục/thuộc tính đa ngành, biến thể, duyệt sản phẩm, tìm kiếm tiếng Việt, sửa sản phẩm và upload ảnh/video local đã có. Worker dùng job/lease trong PostgreSQL. E2E đăng sản phẩm → duyệt → tìm và xem chi tiết đã pass. Upload cloud và sandbox provider còn chờ theo lựa chọn tiếp tục local của chủ sản phẩm.

Phase 3: giỏ/đơn nhiều shop, giữ kho nguyên tử, sự kiện thanh toán idempotent, giao nhận, bằng chứng riêng tư, hoàn một phần và sổ cân đối đã có kiểm thử. Đối soát theo tuần, duyệt và ghi nhận chuyển khoản thủ công; không có công cụ tự chuyển tiền. Live payment/refund provider và đối chiếu phí thực tế chưa kết nối.

Mốc cuối phase 3: 51 integration tests pass, typecheck pass, build pass. Luồng E2E tạo đơn local pass (không thu tiền thật). Hoàn sau khi đã chi trả shop cần quy trình nguồn bù/thu hồi trước production; hiện chặn thao tác để tránh ghi nhận sai tiền.

Chat local: hộp thư riêng, ảnh, thẻ sản phẩm/bài/đơn, trạng thái đọc, chống gửi trùng, chặn người dùng; SSE kiểm tra lại phiên và polling dự phòng. Kiểm duyệt chỉ xem từng tin đã bị báo cáo. Thông báo giao dịch và email qua worker/outbox; local không gửi email ra ngoài. E2E hai phiên gửi/đọc/reload/logout và chặn khách ngoài đã pass.

Phase 4 local: Social, kiểm duyệt, chat, gợi ý từ khóa và danh sách chuẩn bị đã có. Chưa tích hợp AI thật; giao diện ghi rõ chế độ local. Không có mô hình local hay tài khoản AI để đánh giá semantic/chi phí.

PWA: manifest/icons, cài đặt khi trình duyệt hỗ trợ, trang offline, cập nhật có xác nhận và không tự ngắt checkout. Cache chỉ gồm trang offline và icons. E2E đổi tài khoản → truy cập chat cũ → offline đã pass; không hiện dữ liệu tài khoản trước. Push có API/worker và đăng ký gắn với phiên, tự hủy liên kết khi logout; chưa có VAPID/contact để thử gửi thật hoặc thiết bị Android/iOS để nghiệm thu.


Mốc nghiệm thu local sau rà soát: 92 integration tests và 7 browser E2E pass, typecheck và production build pass. Backup/restore PostgreSQL vào database riêng đã pass. CI YAML được parse, workflow hosted chưa chạy vì chưa có remote/run. Báo cáo có CSV, phạm vi shop/quyền Admin, ranh giới ngày Việt Nam và nguồn đơn được xác minh; không ghi nguyên văn truy vấn tìm kiếm vào analytics. Các mức tải/chi phí production, provider thật và kiểm tra thiết bị vẫn theo launch-checklist.


Rà soát độc lập đã phát hiện và sửa trong một lượt: tồn kho từ form cũ; giải phóng/khôi phục kho khi thanh toán lỗi/hủy đơn; không từ chối khoản hoàn bắt buộc; phân trang chat số; audit đọc bằng chứng chat; thời điểm đủ điều kiện đối soát; dữ liệu riêng trên trang công khai khi đổi tài khoản và khôi phục trang Admin sau thu hồi quyền. Hồi quy RED→GREEN và bộ kiểm tra đầy đủ đã qua. Tìm shop/lọc thuộc tính–còn hàng, ước tính giao hàng/bài liên quan, phản hồi đổi trả của shop và tỷ lệ hủy/hoàn có định nghĩa đã được bổ sung.
