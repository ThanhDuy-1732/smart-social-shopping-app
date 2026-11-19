# Discover — gợi ý bằng DeepSeek qua OpenCode (design ngắn)

Ngày: 2026-11-19. Trạng thái: đã duyệt với chủ dự án.

## Intent & lý do

Trang `/discover` hiện gợi ý theo template từ khóa cứng (`localNeeds()`), chỉ nhận diện
vài chủ đề cố định; mọi câu khác đều rơi về một nhóm duy nhất. Mục tiêu: dùng DeepSeek
(model `deepseek-v4.1-flash`) qua gateway OpenCode (`OPENCODE_API_KEY`) để sinh gợi ý
cho **mọi** câu hỏi tiếng Việt tự do, giữ nguyên luồng tra sản phẩm trong catalog.

## Goals

- AI sinh danh sách nhóm cần mua: tiêu đề, lý do, optional, từ khóa tiếng Việt (JSON).
- Catalog vẫn tra sản phẩm thật, lọc ngân sách/tồn kho — AI không bao giờ "bịa" sản phẩm.
- Fallback an toàn: không có key / AI lỗi / JSON sai / timeout → dùng `localNeeds()`,
  notice ghi rõ "AI chưa được kết nối" như hiện tại. Trang không bao giờ chết.
- Giữ quota `discovery` 10 request/60s cho user đăng nhập; không đăng nhập vẫn dùng được.
- Key chỉ đọc server-side: `.env.local` (local) + Environment Variables trên Vercel (prod),
  thêm placeholder vào `.env.example`.

## Non-goals / anti-goals

- Không streaming, không chat hội thoại nhiều lượt.
- Không cho AI chọn trực tiếp sản phẩm (tốn token, phụ thuộc catalog — có thể làm sau).
- Không thêm SDK AI; gọi HTTP trực tiếp OpenAI-compatible
  `https://opencode.ai/inference/openai/v1/chat/completions` bằng `fetch`.

## Approaches đã cân nhắc

1. **AI sinh nhóm nhu cầu + từ khóa (đã chọn)** — thay `localNeeds()` bằng lời gọi AI;
   pipeline tra catalog giữ nguyên. Nhẹ, rẻ, không bịa sản phẩm, fallback tự nhiên.
2. AI chọn trực tiếp sản phẩm từ ứng viên catalog — linh hoạt hơn nhưng prompt lớn,
   tốn token nhiều hơn nhiều, vẫn phụ thuộc catalog. Bỏ qua ở lần này.

## Các quyết định đã chốt

- Endpoint: `https://opencode.ai/inference/openai/v1/chat/completions`, model
  `deepseek-v4.1-flash` (overridable qua `DISCOVERY_AI_MODEL`).
- Input của AI: câu hỏi người dùng (≤300 ký tự) + ngân sách (nếu có). System prompt
  yêu cầu trả JSON thuần: `question` (1 câu làm rõ) + `needs` (1–4 nhóm, mỗi nhóm
  `title` ≤60 ký tự, `reason` ≤160, `optional` boolean, `keywords` 2–5 từ khóa tiếng Việt ≤40 ký tự).
- Validate JSON bằng zod; sai → fallback local. Timeout ~10s (AbortController).
- Response báo `mode: "ai"` và notice tương ứng khi AI thành công; `mode: "local-keywords"`
  giữ nguyên khi fallback.
- Quá 4 nhóm AI trả → cắt còn 4; quá 5 từ khóa → cắt còn 5.

## Còn lại cho người triển khai

- Tên biến/file cụ thể, vị trí module (gợi ý: `src/modules/discovery/ai.ts`).
- Test: unit cho schema + fallback (mock fetch), giữ test hiện có xanh.
- Cập nhật notice trên trang khi AI hoạt động (bỏ dòng "AI chưa được kết nối" tĩnh).
