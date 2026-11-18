# Tích hợp ngoài — khảo sát 18/11/2026

Chưa có tài khoản, credentials, hợp đồng hoặc môi trường sandbox của chủ sản phẩm. Không coi khảo sát tài liệu là kiểm chứng tích hợp thành công.

| Thành phần | Phương án khảo sát | Bằng chứng / giới hạn | Trạng thái |
|---|---|---|---|
| Thanh toán | MoMo | [Hoàn tiền một phần](https://developers.momo.vn/v3/docs/payment/api/payment-api/refund/), [chi hộ](https://developers.momo.vn/v3/docs/payment/api/disbursement-v2/). Các API này không tự chứng minh hợp đồng cho phép thu tiền cho nhiều nhà bán; cần xác nhận thương mại, cơ chế phí và thông báo có xác thực. Không chọn production trước khi có xác nhận. | Chưa chọn; chưa có sandbox credentials |
| Video | Cloudflare Stream | [Direct creator uploads](https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/), [pricing](https://developers.cloudflare.com/stream/pricing/). Chi phí theo phút lưu trữ và phát; phải tính theo lưu lượng và thời lượng dự kiến, không đưa ngân sách cố định chưa có dữ liệu. | Ứng viên; chưa thử upload thật |
| Email | Resend | [Send API](https://resend.com/docs/api-reference/emails/send-email), [pricing](https://resend.com/pricing). Cần API key và miền gửi đã xác minh. Bản local lưu thư vào .local/mail với quyền riêng tư, không gửi ra ngoài. | Được chọn cho adapter email; chưa gửi thật |
| AI | Chưa chọn | Cần structured output, tiếng Việt, giới hạn chi phí và quyền sử dụng dữ liệu. Task AI sẽ chọn qua bộ câu hỏi đánh giá, không mặc định chia sẻ dữ liệu khách. | Chờ Task 13 |

Không trích mức giá tiền đã chưa kiểm tra đầy đủ. Trước khi mua dịch vụ, đối chiếu bảng giá chính thức và tính kịch bản nhu cầu. Không tự đăng ký tài khoản hoặc gửi email cho khách/nhà cung cấp.
