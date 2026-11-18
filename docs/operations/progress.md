# Tiến độ triển khai

- Phase 1 — nền dự án, tài khoản, quyền, duyệt shop (Tasks 1–3): đang thực hiện.
- Phase 2 — danh mục/sản phẩm và media (Tasks 4–5): chưa thực hiện.
- Phase 3 — giỏ hàng, đơn, thanh toán và đối soát (Tasks 6–9): chưa thực hiện.
- Phase 4 — Social, kiểm duyệt, chat và AI (Tasks 10–13): chưa thực hiện.
- Phase 5 — PWA, báo cáo, vận hành và nghiệm thu (Tasks 14–16): chưa thực hiện.

## Bằng chứng

Task 1: health + rollback integration tests 3/3 pass, typecheck pass, production build pass. DB thử và DB local tách riêng, PostgreSQL 18.6 chạy qua Unix socket riêng.

## Phụ thuộc ngoài

Chưa có credentials, tài khoản dịch vụ hoặc hợp đồng thanh toán. Khảo sát provider không đồng nghĩa đã kiểm chứng sandbox. Không tự mua dịch vụ hoặc mở bán thật.

## Lưu ý tooling

`npm audit` sau khi cập nhật Zod còn 5 cảnh báo high theo chuỗi picomatch → fdir/tinyglobby → vite/vitest. Đây là công cụ kiểm thử/build, không phải dependency chạy ứng dụng production; npm hiện không cung cấp bản sửa tương thích qua audit fix. Không dùng audit fix --force để hạ version lớn tùy tiện. Cần kiểm tra lại trước phát hành.
