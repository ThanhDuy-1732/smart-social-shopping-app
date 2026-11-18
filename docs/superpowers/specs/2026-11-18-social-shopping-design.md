# Thiết kế sản phẩm Social Shopping + AI — Việt Nam

Ngày: 18/11/2026. Trạng thái: chủ sản phẩm đã đồng ý giữ nguyên thiết kế và ba mặc định được trình bày; chưa triển khai mã nguồn.

## 1. Mục tiêu và quyết định đã xác nhận

Xây dựng website hỗ trợ PWA, kết nối chia sẻ trải nghiệm, giao tiếp và mua sắm đa ngành. Người dùng có thể bắt đầu từ một bài đăng, một sản phẩm hoặc một nhu cầu bằng ngôn ngữ tự nhiên.

Chủ sản phẩm đã chọn:
- Ra mắt đầy đủ Social, Shopping, AI, chat và Admin.
- Bán đa ngành ngay từ đầu; du lịch chỉ là một ví dụ sử dụng AI.
- Thị trường đầu tiên là Việt Nam.
- Nền tảng có gian hàng riêng và cho shop đối tác tham gia.
- Nền tảng thu tiền khách rồi đối soát, thanh toán lại cho shop.
- Mỗi shop tự đóng gói và giao hàng.

Ba mặc định đã được chủ sản phẩm đồng ý: shop được duyệt trước khi bán; thanh toán trực tuyến, chưa có COD; đối soát hàng tuần và Admin duyệt chi trả. Các chi tiết khác bên dưới là đề xuất của người thiết kế, chưa được coi là quyết định riêng của chủ sản phẩm.

## 2. Các hướng đã cân nhắc

1. Ra mắt đầy đủ: trải nghiệm Social → AI → mua hàng ngay từ lần phát hành đầu; cần hoàn thiện đồng thời sản phẩm và quy trình vận hành. Chủ sản phẩm chọn hướng này.
2. Mua sắm trước: dễ kiểm chứng bán hàng nhưng chưa kiểm chứng được vai trò của Social và AI.
3. Một chủ đề trước: giảm phạm vi nội dung và danh mục nhưng không đáp ứng lựa chọn đa ngành ngay từ đầu.

Có thể xây dựng và kiểm thử từng phần nội bộ. Bản phát hành công khai phải có hành trình xuyên suốt; không âm thầm thu hẹp thành cửa hàng đơn thuần.

## 3. Mặc định đề xuất cho bản ra mắt

- Tiếng Việt, VND, giao hàng nội địa, sản phẩm vật lý thông thường.
- Đa ngành được tổ chức bằng danh mục và thuộc tính riêng; shop chỉ bán ngành hàng nền tảng cho phép. Danh sách ngành hàng và hàng bị hạn chế cần được người vận hành phê duyệt trước khi mở bán.
- Shop đăng ký và được Admin duyệt; một gian hàng cho mỗi chủ shop ở bản đầu. Gian hàng của nền tảng dùng cùng quy trình sản phẩm và đơn hàng.
- Thanh toán trực tuyến qua một đơn vị hỗ trợ mô hình kinh doanh này; chưa chọn nhà cung cấp. Chưa có COD trong đề xuất vì cần thêm luồng thu hộ và đối soát vận chuyển.
- Shop khai báo phí giao hàng theo vùng và thời gian giao dự kiến; khách thấy tổng tiền trước khi thanh toán. Shop tự đặt vận chuyển rồi nhập đơn vị vận chuyển và mã theo dõi.
- Đối soát hàng tuần, Admin duyệt và ghi nhận chuyển khoản; chưa tự động trả tiền cho shop.
- Chính sách hủy, xác nhận nhận hàng, đổi trả, phí và thời hạn xử lý được công bố trước khi mở bán. Giá trị cụ thể phải chốt trước vận hành, không tự suy diễn là 7 hay 14 ngày.
- Phí nền tảng là tỷ lệ thỏa thuận với shop, được lưu tại thời điểm phát sinh đơn. Không thêm phí đăng bài hoặc gói thành viên ở bản đầu.

Phạm vi mặc định chưa bao gồm hàng số, dịch vụ đặt lịch, hàng xuyên biên giới, livestream, gọi thoại/video, chat nhóm, ví nạp/rút tiền, quảng cáo tự phục vụ hay hệ thống affiliate. Đây là các chức năng ngoài yêu cầu hiện tại, không phải phần bị cắt khỏi Social, Shopping hoặc AI.

## 4. Vai trò và trải nghiệm

### Người dùng
- Xem nội dung và sản phẩm công khai; đăng nhập để đăng bài, tương tác, chat, đặt hàng.
- Hồ sơ cá nhân, theo dõi, đăng ảnh và video có mô tả, gắn nhiều sản phẩm, thích, bình luận, lưu bài, chia sẻ liên kết, chặn và báo cáo tài khoản.
- Feed theo dõi theo thời gian và mục khám phá theo chủ đề/tương tác. Chưa cần huấn luyện thuật toán feed riêng.
- Tìm sản phẩm, bài viết và shop; lọc danh mục, khoảng giá, thuộc tính theo ngành hàng và khả năng còn hàng.
- Xem biến thể, tồn kho, giá, phí giao dự kiến, shop, đánh giá từ giao dịch đã hoàn tất và bài chia sẻ liên quan.
- Giỏ hàng nhiều shop, thanh toán, theo dõi đơn từng shop, hủy khi đủ điều kiện, yêu cầu đổi trả/hoàn tiền và gửi bằng chứng.
- Lưu danh sách AI gợi ý, điều chỉnh và thêm từng sản phẩm vào giỏ; không tự mua hoặc tự thay mặt người dùng đặt hàng.

### Chat
- Chat cá nhân giữa người dùng và với shop; gửi văn bản, ảnh, thẻ sản phẩm/bài viết và tham chiếu đơn hàng.
- Lịch sử có phân trang, trạng thái gửi/đọc, thông báo chưa đọc, chặn và báo cáo.
- Chỉ thành viên hội thoại được đọc. Nhân sự xử lý báo cáo chỉ truy cập phần bằng chứng được phép theo chính sách và có nhật ký; không mặc định mở toàn bộ tin nhắn cho mọi Admin.

### Shop
- Đăng ký, cung cấp thông tin xác minh và tài khoản nhận tiền, chờ duyệt.
- Quản lý sản phẩm, danh mục được phép bán, thuộc tính, biến thể, ảnh/video, giá, tồn kho và trạng thái bán.
- Xác nhận đơn, giao hàng, cập nhật mã theo dõi, trả lời chat và yêu cầu đổi trả.
- Xem doanh số, phí, khoản chờ, khoản đủ điều kiện thanh toán, khoản bị giữ vì tranh chấp và lịch sử đối soát của riêng mình.

### Admin
- Phân quyền riêng cho quản trị, kiểm duyệt, hỗ trợ và tài chính; chỉ cấp quyền cần thiết.
- Duyệt/khóa shop, kiểm duyệt sản phẩm/bài viết, xử lý báo cáo và khiếu nại.
- Quản lý danh mục đa ngành, thuộc tính, phí và các chính sách vận hành.
- Theo dõi đơn, thanh toán, hoàn tiền, đối soát và xuất báo cáo; lưu nhật ký thay đổi nhạy cảm.
- Báo cáo tổng giá trị hàng bán, doanh thu phí nền tảng, tiền phải trả shop, tỷ lệ hoàn/hủy, người dùng hoạt động và hành trình bài viết/AI → sản phẩm → đơn hàng. Không gộp tổng tiền hàng thành doanh thu của nền tảng.

## 5. AI mua sắm đa ngành

Ví dụ: “Tôi muốn đi Trung Quốc” hoặc “Tôi cần bố trí góc làm việc nhỏ”.

1. Nhận diện mục tiêu, ngữ cảnh, ngân sách và các thông tin còn thiếu. Chỉ hỏi thông tin thực sự ảnh hưởng đến gợi ý.
2. Tách nhu cầu thành các nhóm cần chuẩn bị; phân biệt thiết yếu và tùy chọn, không mặc định mọi thứ đều phải mua.
3. Tìm sản phẩm đang được phép bán và nội dung công khai liên quan bằng từ khóa, thuộc tính và tìm kiếm ngữ nghĩa khi phù hợp.
4. Trả về danh sách nhóm sản phẩm/từ khóa, sản phẩm có thật, bài Social có thật và lý do phù hợp. Nếu chưa có hàng, nói rõ và chỉ gợi ý từ khóa thay vì bịa sản phẩm.
5. Cho phép lọc lại theo ngân sách, bỏ món, lưu danh sách, xem sản phẩm và thêm vào giỏ.

Giá và tồn kho hiển thị lấy từ dữ liệu hệ thống, kiểm tra lại khi đặt hàng. Chỉ tìm nội dung mà người dùng có quyền xem; không sử dụng chat riêng làm nguồn gợi ý mặc định. Nội dung người dùng và mô tả shop là dữ liệu không đáng tin cậy, không được phép điều khiển AI hoặc truy cập công cụ vượt quyền. Có giới hạn sử dụng và theo dõi chi phí. Không coi nội dung AI là nguồn xác nhận quy định nhập cảnh hoặc tư vấn chuyên môn cho ngành hàng nhạy cảm.

## 6. Đơn hàng, tiền và giao nhận

- Một lần thanh toán có thể bao gồm nhiều đơn con theo shop. Lưu giá, biến thể, số lượng, phí vận chuyển và quy tắc phí tại thời điểm đặt hàng.
- Kiểm tra và giữ tồn kho có thời hạn; giải phóng khi thanh toán thất bại/hết hạn. Ngăn mua vượt tồn khi nhiều khách thanh toán đồng thời.
- Xác nhận tiền từ phía máy chủ và thông báo có xác thực của nhà cung cấp; trang khách quay về không phải bằng chứng thanh toán.
- Xử lý thông báo lặp hoặc sai thứ tự mà không tạo trùng đơn, trừ tồn hoặc hoàn tiền nhiều lần.
- Trạng thái đơn, thanh toán, vận chuyển, hoàn tiền và đối soát tách biệt; có lịch sử sự kiện để truy vết.
- Cho phép xử lý hủy/hoàn một phần của một đơn con; giữ lại khoản đang tranh chấp, các khoản khác xử lý theo chính sách.
- Khi shop tự vận chuyển, mã theo dõi do shop nhập không tự chứng minh giao thành công. Người mua xác nhận hoặc nhân sự vận hành xác minh bằng chứng; trước khi chốt quy tắc xác nhận tự động, không giải ngân chỉ dựa vào shop đánh dấu đã giao.
- Phân biệt tiền hàng, vận chuyển, phí nền tảng, khoản hoàn, khoản phải trả shop và khoản đã trả. Điều chỉnh bằng bút toán bổ sung có lý do, không sửa xóa lịch sử tài chính đã ghi nhận.
- Đối soát chỉ gồm khoản đủ điều kiện; chặn thanh toán trùng. Lưu người duyệt, bằng chứng chuyển tiền và kết quả đối chiếu.
- Cần kiểm chứng nhà cung cấp hỗ trợ thu tiền cho sàn, hoàn tiền một phần và cơ chế chi trả dự kiến trước khi cam kết tích hợp. Sổ theo dõi nội bộ không đồng nghĩa với việc cung cấp dịch vụ ví hoặc tự giữ tiền theo bất kỳ mô hình pháp lý nào.

## 7. Kiến trúc đề xuất, chưa chọn công nghệ

- Ba khu giao diện: website/PWA cho khách, khu Seller và site Admin; dùng chung dịch vụ nghiệp vụ và dữ liệu, phân quyền phía máy chủ.
- Bắt đầu bằng một ứng dụng máy chủ chia module: tài khoản/quyền, Social, chat, danh mục/sản phẩm, tìm kiếm/AI, giỏ/đơn, thanh toán/đối soát, thông báo và kiểm duyệt. Chưa tách microservice khi chưa có số liệu cần thiết.
- Cơ sở dữ liệu giao dịch quan hệ; kho đối tượng và CDN cho ảnh/video; xử lý nền cho chuyển mã video, thông báo, lập chỉ mục và đối soát.
- Video tải lên có giới hạn dung lượng/thời lượng công bố; kiểm tra định dạng, xử lý bất đồng bộ, chỉ phát hành khi sẵn sàng. Dùng dịch vụ xử lý media sẵn có thay vì tự viết bộ chuyển mã.
- Dữ liệu chính: User, Shop, ShopMember, Category, Attribute, Product, Variant, Inventory, Post, PostProduct, Follow, Comment, Conversation, Message, Cart, Checkout, ShopOrder, OrderItem, Payment, Shipment, ReturnCase, Refund, LedgerEntry, Settlement, Report, AuditEvent, SavedList.
- Shop không xem/sửa dữ liệu shop khác; khách chỉ xem đơn và hội thoại của mình. Không lưu thông tin thẻ thanh toán thô.
- Sao lưu và kiểm tra khôi phục; giám sát lỗi, tác vụ nền thất bại và sai lệch tiền. Bí mật và dữ liệu cá nhân không được đưa vào log hoặc ngữ cảnh AI tùy tiện.

Tên framework, nhà cung cấp AI, cơ sở dữ liệu, hạ tầng và cổng thanh toán để người triển khai đánh giá theo năng lực đội ngũ, chi phí và thử nghiệm tích hợp. Chưa có lựa chọn công nghệ nào được chủ sản phẩm xác nhận.

## 8. Website và PWA

- Ưu tiên trải nghiệm điện thoại, vẫn đầy đủ trên máy tính; trang sản phẩm/bài công khai có thể chia sẻ và được lập chỉ mục theo chính sách hiển thị.
- Hỗ trợ cài đặt trên trình duyệt/thiết bị tương thích, biểu tượng ứng dụng và thông báo khi người dùng cấp quyền và nền tảng hỗ trợ.
- Có màn hình mất kết nối và cơ chế cập nhật an toàn. Không hứa mua hàng/chat ngoại tuyến; không lưu cache riêng tư của đơn, chat, Admin hay thanh toán dùng chung giữa các tài khoản.
- Hỗ trợ bàn phím, nhãn biểu mẫu, trạng thái lỗi và tương phản dễ đọc; việc cài PWA không phải điều kiện để dùng website.

## 9. Tiêu chí chấp nhận bản ra mắt

1. Người dùng đăng ảnh/video, gắn sản phẩm, người khác tìm/xem bài và mua được sản phẩm đó.
2. AI xử lý được nhiều nhóm nhu cầu thuộc các ngành hàng khác nhau, đưa nguồn sản phẩm/bài thực và phản hồi đúng khi không tìm thấy.
3. Hai shop nhận hai đơn riêng từ một thanh toán; quyền truy cập, tồn kho, phí và tổng tiền chính xác.
4. Có minh chứng kiểm thử thanh toán thất bại, thông báo lặp, hết hàng đồng thời, hoàn tiền một phần, tranh chấp và đối soát không trùng.
5. Chat, chặn, báo cáo, duyệt shop và kiểm duyệt nội dung hoạt động; dữ liệu riêng không lộ cho tài khoản khác.
6. Shop cập nhật vận chuyển; khách xác nhận nhận hàng hoặc có quy trình xác minh; khoản chưa đủ điều kiện không được chi trả.
7. Báo cáo tài chính đối chiếu được với đơn, thanh toán, hoàn tiền và khoản trả shop.
8. Website dùng được trên điện thoại/máy tính; PWA được kiểm tra trên danh sách thiết bị mục tiêu, xử lý mất mạng và cập nhật không làm lộ dữ liệu.

## 10. Trình tự triển khai nội bộ

1. Chốt chính sách, danh mục mở bán và nhà cung cấp; thử tích hợp thanh toán, video, thông báo.
2. Xây nền tài khoản/phân quyền, shop, danh mục/sản phẩm và media.
3. Hoàn thiện giỏ/đơn/thanh toán/giao nhận/hoàn tiền/đối soát cùng khu Seller và Admin liên quan.
4. Hoàn thiện Social, chat, kiểm duyệt và AI trên dữ liệu thật.
5. Hoàn thiện PWA, báo cáo, kiểm thử xuyên suốt và chạy thử có kiểm soát trước ra mắt đầy đủ.

Không ước lượng ngày hoặc ngân sách khi chưa biết đội ngũ, lưu lượng dự kiến và lựa chọn dịch vụ.

## 11. Điều kiện phải chốt trước vận hành thực tế

- Ngành hàng được mở bán, hàng bị hạn chế, thông tin bắt buộc và quy trình kiểm duyệt theo ngành.
- Mức phí, phí vận chuyển, thời hạn xác nhận/hủy/đổi trả, bằng chứng giao hàng và trách nhiệm bồi hoàn.
- Nhà cung cấp thanh toán và tính phù hợp của mô hình thu/chi, thủ tục vận hành sàn, dữ liệu cá nhân và thông tin công bố. Đây là các mục cần xác minh, tài liệu này không kết luận yêu cầu pháp lý hiện hành.
- Quy mô thử tải và mức chi phí chấp nhận được cho video, AI, lưu trữ và thông báo; người phụ trách hỗ trợ, kiểm duyệt và tài chính.

Các mục này không ngăn lập kế hoạch kỹ thuật có giả định ghi rõ, nhưng phải giải quyết trước mở bán và thu tiền thật.
