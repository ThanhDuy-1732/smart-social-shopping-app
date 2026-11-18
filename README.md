# Mình dùng

Website/PWA social shopping đa ngành cho thị trường Việt Nam. Tình trạng thực tế và phần chưa hoàn thành được cập nhật trong `docs/operations/progress.md`.

## Chạy local

Cần Node.js 22.13+ và PostgreSQL. `npm ci`, tạo `.env.local` từ `.env.example`, điền thông tin DB và secret ngẫu nhiên (`openssl rand -base64 32`). Với Docker: đặt `POSTGRES_PASSWORD` riêng trong shell rồi chạy `docker compose up -d`; tạo thêm database `shopping_test` cho kiểm thử. Không dùng database thật cho test.

Nếu đã có bộ binary PostgreSQL: `PG_BIN_DIR=/path/to/postgres/bin npm run db:local`. Script tạo cluster riêng trong `.local/`, chỉ mở Unix socket quyền riêng tư, không bật cổng TCP, và tự tạo `.env.local` / `.env.test` nếu chưa có. Nếu dùng native binary ở `.local/postgres-bin/package/native/bin/`, script tự nhận. Không sửa các dịch vụ PostgreSQL khác trên máy.

Trên máy phát triển macOS arm64 hiện tại, binary hệ thống hỏng thư viện ICU nên đã tải binary biệt lập từ gói npm `@embedded-postgres/darwin-arm64@18.6.0-beta.19` vào `.local/`. Đây là công cụ local không được đóng gói production. Có thể tái tạo bằng `npm pack @embedded-postgres/darwin-arm64@18.6.0-beta.19 --pack-destination .local`, rồi giải nén vào `.local/postgres-bin/`.

Sau khi có DB: `npm run db:migrate`, `npm run dev`; mở http://127.0.0.1:3000. Dùng cùng hostname trong `BETTER_AUTH_URL`.

## Kiểm tra

`npm test`, `npm run typecheck`, `npm run build`, `npm run test:e2e`. Integration test đọc `.env.test`, yêu cầu database thử riêng. Không đưa `.env*`, `.local`, private email hoặc credentials vào Git.

## Tài liệu

- Thiết kế: `docs/superpowers/specs/2026-11-18-social-shopping-design.md`
- Kế hoạch: `docs/superpowers/plans/2026-11-18-social-shopping-implementation.md`
- Tích hợp: `docs/operations/providers.md`

Chưa triển khai production. Chưa có credentials thanh toán, AI hoặc media, không có giao dịch thật.

## Tài khoản local và quản trị

Đăng ký tại `/register`. Khi `MAIL_TRANSPORT=local`, đọc thư xác minh trong `.local/mail/*.json` (chỉ local, không có inbox công khai trên website). Sau khi xác minh, đăng nhập, vào `/settings` và bật xác thực hai bước. Chỉ người vận hành có quyền truy cập shell/DB mới chạy `npm run admin:grant -- owner@example.com` để cấp Admin đầu tiên. Không có tài khoản hoặc mật khẩu mặc định.

Ở production phải cấu hình `MAIL_TRANSPORT=resend`, `RESEND_API_KEY`, `MAIL_FROM` và miền gửi đã xác minh. Chế độ thư local bị từ chối khi gửi trong production.

## Media local

Chạy thêm `npm run worker` trong terminal thứ hai. Cần `ffmpeg` có trong PATH (hoặc đặt `FFMPEG_PATH`). Ảnh được decode/resize và chuyển WebP bằng sharp; MP4 được chuyển mã H.264/AAC tối đa 2 phút. Tệp gốc và dữ liệu thư/DB nằm trong `.local/`, không public trực tiếp. Chỉ tệp đã sẵn sàng và được đính vào sản phẩm công khai mới đọc được khi chưa đăng nhập; người tải lên xem được tệp riêng của mình.

Media local phục vụ phát triển một máy, bị chặn upload trong production. Cần dịch vụ media/kho bền vững và kiểm chứng tích hợp trước khi mở cho người dùng thật. Worker giữ job trong PostgreSQL, có lease và retry, không dựa vào bộ nhớ tiến trình.
