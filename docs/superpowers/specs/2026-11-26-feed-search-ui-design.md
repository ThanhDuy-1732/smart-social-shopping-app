# Giao diện bảng tin và tìm món — bản D (Quầy kính)

Ngày: 2026-11-26
Trạng thái: đã được duyệt qua bản demo `/preview/d`

## Ý định

Thay giao diện `/feed` và `/search` bằng hướng D đã chọn: bề mặt kính và chuyển màu
của bản B, nhưng giá, tồn kho, nhãn và nút bấm theo ngôn ngữ phiếu của bản C.

Quy tắc phân vai:

- **Kể chuyện thì mềm:** nền gradient, thanh lệnh kính, thẻ bài mờ, ô tìm kiếm nổi,
  nút chính gradient.
- **Dữ liệu mua bán thì cứng:** dòng giá kiểu hoá đơn (tên … giá), chữ đều cho giá và
  tồn kho, tem "Còn N"/"Hết hàng", nhãn chủ đề dán nghiêng, phiếu giấy cho bộ lọc và
  ghi chú, nút chip viền đậm có bóng cứng.

## Phạm vi

- Viết lại phần trình bày của `src/app/(public)/feed/page.tsx` và
  `src/app/(public)/search/page.tsx`.
- Không đổi truy vấn, quyền, phân trang, server action hay API.
- Không đổi `/`, `/discover`, `/products`, `/posts`, trang quản trị.
- CSS mới nằm trong `globals.css`, scoped dưới `.d-surface`.
- Header/footer dùng lại biến màu chung; trên hai trang này biến được đổi sang tím
  chàm bằng `body:has(.d-surface)` để không lệch tông.

## Dữ liệu và cách hiển thị

- Bài dẫn: bài đầu của trang. Ảnh/video đầu tiên, nhãn chủ đề đầu tiên, nội dung đầy
  đủ, phiếu giá cho tối đa 2 sản phẩm trong bài.
- Bài còn lại: thẻ kính, nội dung cắt 3 dòng, phiếu giá, hàng nút thích/lưu/bình luận.
- Rail: chủ đề lấy từ các bài đang hiển thị, phiếu "Món đang được nhắc" lấy sản phẩm
  trong bài, phiếu "Viết bài".
- Tìm món: hero kính + ô tìm; phiếu giấy "Đang lọc" tóm tắt bộ lọc đang bật và số món
  đang hiển thị; phiếu lọc giấy giữ nguyên ngành hàng, khoảng giá, thuộc tính và
  "chỉ còn hàng"; kết quả là thẻ giấy có tem tồn kho; gian hàng khớp tên là dải giấy.
- Không hiển thị số liệu không có nguồn (ví dụ "38 món mới", "thời gian đã dùng").

## Điều đã cân nhắc

- Bỏ lưới ô ngành hàng dạng sticker của bản demo vì dữ liệu thật không có số lượng
  món; thay bằng bộ lọc ngành hàng trong phiếu giấy và các chip lọc nhanh có thật.
- Bỏ gợi ý "người nên theo" vì chưa có truy vấn gợi ý; thay bằng "Món đang được nhắc".
- Ảnh sản phẩm không có cover dùng khối màu theo id, không tạo ảnh giả.

## Kiểm chứng

- `npm run typecheck`, `npm run build`.
- Soát ở 1440px và 390px: thanh chuyển tab, thẻ bài, tem, phiếu lọc, trạng thái rỗng,
  lỗi, phân trang, focus bàn phím, reduced motion.
