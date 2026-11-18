# Nghiệm thu local — 18/11/2026

| Kiểm tra | Kết quả |
|---|---|
| Integration với PostgreSQL thật | 92/92, 20 file |
| Browser E2E với Chrome desktop | 7/7 |
| TypeScript | `npm run typecheck` pass |
| Build | `npm run build` pass |
| Backup/restore | `pg_dump` 18 → database recovery riêng → `pg_restore`, đối chiếu schema/đơn/thông báo/sổ cân đối pass |
| CI workflow | YAML parse pass; chưa chạy hosted |
| Dependency audit | 5 high ở chuỗi picomatch/Vite/Vitest, kể cả `--omit=dev` do optional peer của Better Auth; chưa có bản sửa tương thích được xác nhận |

Có một lượt rà soát độc lập toàn nhánh bằng reviewer riêng, tiếp theo một lượt sửa với kiểm thử hồi quy. Không coi author tự kiểm tra sau sửa là một lượt review độc lập thứ hai.

Các hồi quy đã quan sát thất bại trước sửa rồi thành công: stock từ form cũ; hủy đơn đã trả tiền và nghĩa vụ hoàn bắt buộc; thanh toán lỗi nhả kho rồi nhận kết quả trả tiền muộn trong lúc người khác giữ hàng; cutoff đối soát trước khi đủ điều kiện; 110 tin nhắn qua ba trang; nhật ký đọc text chat được báo cáo; danh sách riêng/feed đã lưu trên tab công khai sau đổi tài khoản; trang Admin sau thu hồi quyền của cùng người dùng. Bộ kiểm tra đầy đủ được chạy lại sau các sửa đổi.

Luồng bổ sung đã kiểm tra bằng DB: shop theo tên, bộ lọc thuộc tính/còn hàng, nguồn bài gắn sản phẩm và ước tính giao hàng, shop phản hồi đúng yêu cầu, tỷ lệ hủy/hoàn có mẫu số xác định.

E2E bao gồm đăng ký/xác minh/login, MFA và duyệt shop/sản phẩm, tìm/mua giỏ/tạo đơn local, gợi ý từ khóa/lưu danh sách, hai phiên chat, từ chối truy cập ngoài, logout/đổi tài khoản/thu hồi quyền, CSV và offline không cache riêng. Không có thao tác trả tiền giả qua UI hoặc callback công khai không xác thực.

Chưa chứng nhận: live provider/payment/refund/AI/media/email/push, Android/iOS thật, hosted CI, tải và chi phí production, PITR/backup ngoài máy. Xem `launch-checklist.md` trước mở bán. Kiểm tra giao diện local 390px không bị tràn ngang; không có lỗi page-error trong lần xem trang chủ và gợi ý. Đây không phải audit khả năng truy cập toàn diện trên thiết bị thật.
