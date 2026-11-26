# Kế hoạch: áp giao diện D cho /feed và /search

1. Thêm CSS production vào `src/app/globals.css`
   - token `.d-surface`, nền gradient toàn chiều rộng, đổi biến màu header/footer
     bằng `body:has(.d-surface)`
   - thanh lệnh kính, thẻ bài, phiếu giá, tem, chip, phiếu lọc, ô tìm kiếm
   - responsive 1000px / 760px / 560px, reduced motion, focus
2. Thêm `src/components/community-post-card.tsx`
   - nhận `PostCard`, `signedIn`, `featured`
   - media đầu tiên, nhãn chủ đề, nội dung, phiếu sản phẩm
   - giữ `ActionForm` + `socialAction` cho thích/lưu, `ReportForm`
3. Thêm `src/components/catalog-grid.tsx`
   - nhận `ProductCard[]`, ảnh thật hoặc khối màu theo id
   - tem tồn kho, giá chữ đều, trạng thái còn/hết
4. Viết lại `feed/page.tsx`
   - giữ `listFeed`, mode, query, cursor
   - thanh kính + tab, bài dẫn, rail chủ đề/món/CTA, lưới bài, rỗng, lỗi, xem thêm
5. Viết lại `search/page.tsx`
   - giữ `searchCatalog`, `searchShops`, `listCategories`, thuộc tính, phân trang
   - hero + ô tìm, phiếu "Đang lọc", phiếu lọc, chip nhanh, kết quả, gian hàng
6. Kiểm chứng
   - `npm run typecheck`, `npm run build`
   - chụp 1440px và 390px cho trạng thái có dữ liệu (preview) và rỗng
