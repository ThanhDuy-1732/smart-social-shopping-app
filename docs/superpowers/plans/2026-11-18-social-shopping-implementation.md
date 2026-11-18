# Social Shopping Việt Nam — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ra mắt website/PWA đa ngành tại Việt Nam, đầy đủ Social, chat, AI mua sắm, sàn nhiều shop, Seller và Admin, thu tiền tập trung và đối soát hàng tuần.

**Architecture:** Một ứng dụng máy chủ chia module nghiệp vụ; giao diện khách, Seller và Admin dùng chung dịch vụ nhưng phân quyền phía máy chủ. PostgreSQL lưu dữ liệu giao dịch; media ở kho đối tượng/CDN; một worker xử lý tác vụ nền bền vững. Từng task có kết quả kiểm thử độc lập; chỉ ra mắt công khai sau khi hoàn tất toàn bộ hành trình.

**Tech Stack:** Đề xuất của người lập kế hoạch: TypeScript, Next.js App Router trên Node.js, PostgreSQL với `pg` và SQL migrations, Better Auth, Vitest và Playwright. CSS dùng hệ thống component của dự án sau khi có; không thêm bộ UI hoặc dịch vụ tìm kiếm riêng trước khi có nhu cầu. Phiên bản ổn định tương thích được chốt bằng lockfile ở Task 1; chưa cài đặt gì. Nhà cung cấp thanh toán, AI, email và media được chọn bằng Task 1, không mặc định đã có tài khoản hoặc hợp đồng.

**Spec:** `docs/superpowers/specs/2026-11-18-social-shopping-design.md` — đọc cùng kế hoạch. Các chi tiết kỹ thuật trong kế hoạch là đề xuất triển khai, không phải lựa chọn công nghệ đã được chủ sản phẩm xác nhận riêng.

## Global Constraints

- “Ra mắt đầy đủ Social, Shopping, AI, chat và Admin.”
- “Bán đa ngành ngay từ đầu; du lịch chỉ là một ví dụ sử dụng AI.”
- “Thị trường đầu tiên là Việt Nam.”
- “Nền tảng có gian hàng riêng và cho shop đối tác tham gia.”
- “Nền tảng thu tiền khách rồi đối soát, thanh toán lại cho shop.”
- “Mỗi shop tự đóng gói và giao hàng.”
- Shop được duyệt trước khi bán; thanh toán trực tuyến, chưa có COD; đối soát hàng tuần, Admin duyệt chi trả.
- Không giả lập thành công thanh toán/giao hàng/chi trả trong môi trường thật. Demo và sandbox phải được ghi rõ.
- Không tự đặt tỷ lệ phí, thời hạn đổi trả hoặc thời điểm tự xác nhận nhận hàng. Thiếu chính sách thì không mở bán thật.
- Không đổi báo cáo tổng tiền hàng thành doanh thu phí; không dùng số thực để tính tiền.

## Review Focus

1. Thanh toán đến sau khi giữ hàng hết hạn: không bán vượt tồn hoặc nhận tiền mà bỏ quên xử lý — Task 7.
2. Hàng bị ẩn/khóa shop sau khi đã gắn vào bài hoặc kết quả AI: không cho đặt mua, vẫn truy vết đơn cũ — Tasks 4, 11, 13.
3. Quyền bị thu hồi trong khi phiên đăng nhập còn hiệu lực: chặn thao tác và đọc dữ liệu ngay ở máy chủ — Task 2.
4. Hoàn tiền phát sinh đồng thời với lập đợt chi trả: không trả thừa và không âm thầm sửa lịch sử — Tasks 8–9.
5. Đăng xuất/đổi tài khoản khi PWA còn mở: không hiện lại chat/đơn riêng từ cache, lịch sử điều hướng hoặc kết nối cũ — Tasks 12, 14.

## Cấu trúc file và quy ước chung

- `src/app/(public)/`: feed, tìm kiếm, sản phẩm, gian hàng, hồ sơ công khai.
- `src/app/(account)/`: giỏ, checkout, đơn, chat, danh sách đã lưu và cài đặt.
- `src/app/seller/`, `src/app/admin/`: khu vận hành. Kiểm tra quyền trong dịch vụ, không chỉ trong layout.
- `src/app/api/`: Route Handlers mỏng; đọc đầu vào, xác thực, gọi dịch vụ, trả DTO.
- `src/modules/<domain>/`: `service.ts`, `queries.ts` nếu cần, `schema.ts` kiểm tra đầu vào; chỉ tạo file khi có trách nhiệm thực.
- `src/server/`: DB, auth, cấu hình, provider đã chọn, worker và audit; không import vào client.
- `db/migrations/`: migration tiến, có kế hoạch rollback/khôi phục; `db/seeds/` chỉ dữ liệu phát triển.
- `tests/integration/`, `tests/e2e/`, `tests/fixtures/`: kiểm tra bằng DB thử và dữ liệu tổng hợp, không dùng dữ liệu thật.
- `docs/operations/`: chính sách đã phê duyệt, nhà cung cấp, hướng dẫn vận hành và phát hành.

**Hợp đồng dùng chung** trong `src/modules/shared/types.ts`:
- `Id = string`; thời gian truyền qua HTTP là chuỗi ISO UTC; giao diện hiển thị giờ Việt Nam.
- `Actor = { userId: Id }`; quyền thực đọc từ DB khi cần, không tin role do client gửi.
- `Money = bigint` theo đơn vị đồng VND, không âm trừ bút toán được phép; HTTP truyền số tiền dạng chuỗi thập phân.
- `Page<T> = { items: T[]; nextCursor: string | null }`; cursor có kiểm tra, page size có giới hạn.
- `DomainError` có code `UNAUTHENTICATED | FORBIDDEN | INVALID_INPUT | NOT_FOUND | CONFLICT | PROVIDER_UNAVAILABLE`; API không trả stack hoặc bí mật.
- Giao dịch DB dùng một connection, rollback khi lỗi; khóa hàng theo thứ tự ID nhất quán.
- Các ID, đầu vào và DTO ở task sau được khai báo/export tại module sở hữu; không tạo package hợp đồng riêng.

**Chu kỳ kiểm tra cho mỗi task:** viết kiểm tra nghiệp vụ cần thiết → chạy thấy thất bại đúng lý do → triển khai tối thiểu → chạy lại kiểm tra → typecheck. Không thêm test chỉ để lặp lại cấu hình hoặc giao diện tĩnh. Lệnh dự kiến do Task 1 định nghĩa: `npm run test -- <file>`, `npm run test:e2e -- <file>`, `npm run typecheck`, `npm run build`. Sau mỗi task hoàn tất, commit đúng file của task nếu workspace đã được khởi tạo Git; không tự cấu hình danh tính Git hoặc remote.

---

### Task 1: Kiểm chứng tích hợp và dựng nền chạy được

**Files:** Create `package.json`, lockfile, `tsconfig.json`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/api/health/route.ts`, `src/server/db.ts`, `src/server/config.ts`, `src/modules/shared/types.ts`, `tests/integration/health.test.ts`, `compose.yaml`, `.env.example`, `.gitignore`, `docs/operations/providers.md`.
**Interfaces:** Produces `db` (PostgreSQL pool), `withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T>`, `GET /api/health` không lộ cấu hình.
- [ ] Ghi ma trận nhà cung cấp: thanh toán hỗ trợ sàn/hoàn một phần/thông báo có xác thực, media có upload và chuyển mã, AI có structured output, email có gửi xác minh. Ghi bằng chứng chính thức và chi phí tại thời điểm kiểm tra; chưa mua dịch vụ hoặc tạo tài khoản thay chủ sản phẩm.
- [ ] Chốt bộ phiên bản tương thích vào lockfile; tạo scripts trên và DB local. Chỉ tạo adapter nhà cung cấp khi nghiệp vụ tương ứng dùng tới, không dựng wrapper tổng quát.
- [ ] Test `health.test.ts`: kết nối DB thành công trả 200; DB không sẵn sàng trả 503 không chứa connection string. Chạy test trước/sau triển khai, rồi `npm run build` phải thành công.
- [ ] Ghi rõ dịch vụ nào mới có sandbox và phụ thuộc nào cần chủ sản phẩm cung cấp. Không để Task 7 được coi hoàn tất nếu chỉ có mock.

### Task 2: Tài khoản, phân quyền và ranh giới riêng tư

**Files:** Create `src/server/auth.ts`, `src/app/api/auth/[...all]/route.ts`, `src/modules/access/service.ts`, `src/app/(account)/settings/page.tsx`, `src/app/(public)/login/page.tsx`, `src/app/(public)/register/page.tsx`, `src/app/admin/users/page.tsx`, `db/migrations/001_identity.sql`, `tests/integration/access.test.ts`.
**Interfaces:** Produces `requireActor(headers: Headers): Promise<Actor>` và `requirePermission(actor: Actor, permission: string, shopId?: Id): Promise<void>`. Email/password xác minh email và khôi phục mật khẩu bằng Better Auth; schema auth theo migration chính thức, không tự hash mật khẩu.
- [ ] Test đăng ký/xác minh/đăng nhập, token reset hết hạn, logout; thông tin tài khoản không bị dò qua phản hồi reset. Thu hồi role khi cookie còn hạn phải làm request tiếp theo trả 403.
- [ ] Tạo vai trò người dùng, chủ shop, quản trị, kiểm duyệt, hỗ trợ, tài chính. Yêu cầu xác thực bổ sung cho vai trò đặc quyền; ghi audit thay đổi quyền. Không có mật khẩu Admin mặc định trong seed công khai.
- [ ] Nối UI đăng nhập, reset, trạng thái lỗi; bảo vệ mutation khỏi request giả mạo và giới hạn thử đăng nhập bằng tính năng auth hiện có.
- [ ] Chạy `npm run test -- tests/integration/access.test.ts` và typecheck; kỳ vọng tất cả pass.

### Task 3: Đăng ký shop và chính sách có phiên bản

**Files:** Create `db/migrations/002_shops_policies.sql`, `src/modules/shops/service.ts`, `src/modules/policies/service.ts`, `src/app/seller/onboarding/page.tsx`, `src/app/admin/shops/page.tsx`, `src/app/admin/policies/page.tsx`, `tests/integration/shops.test.ts`.
**Interfaces:** `applyForShop(actor, input: ShopApplication): Promise<Id>`, `reviewShop(actor, shopId: Id, decision: 'approve' | 'reject', reason: string): Promise<void>`, `getActivePolicy(): Promise<TradingPolicy>`; TradingPolicy chứa phiên bản, tỷ lệ phí basis points, quy tắc vùng giao, hủy/đổi trả và xác nhận nhận hàng.
- [ ] Test shop chưa duyệt không xuất bản sản phẩm; chủ shop không tự duyệt; tài khoản A không đọc thông tin ngân hàng shop B; chính sách chưa đủ không kích hoạt mở bán.
- [ ] Tạo một shop cho mỗi owner, thông tin xác minh lưu riêng có quyền truy cập; thay đổi thông tin nhận tiền cần xác minh và audit. Gian hàng nền tảng cũng dùng cùng bảng và quyền.
- [ ] Hoàn thiện UI đăng ký/duyệt và thiết lập chính sách; không seed mức phí hoặc thời hạn giả thành chính sách thật.
- [ ] Chạy `npm run test -- tests/integration/shops.test.ts` và typecheck.

### Task 4: Danh mục đa ngành, sản phẩm và tìm kiếm

**Files:** Create `db/migrations/003_catalog.sql`, `src/modules/catalog/service.ts`, `src/modules/catalog/queries.ts`, `src/app/seller/products/page.tsx`, `src/app/admin/categories/page.tsx`, `src/app/(public)/products/[id]/page.tsx`, `src/app/(public)/shops/[id]/page.tsx`, `src/app/(public)/search/page.tsx`, `tests/integration/catalog.test.ts`.
**Interfaces:** `saveProduct(actor, input: ProductInput): Promise<Id>`, `publishProduct(actor, productId: Id): Promise<void>`, `searchCatalog(input: CatalogQuery): Promise<Page<ProductCard>>`; ProductInput có categoryId, thuộc tính theo schema ngành, biến thể/SKU, giá Money và tồn kho nguyên không âm.
- [ ] Test ít nhất ba nhóm dữ liệu tổng hợp quần áo/điện tử/mỹ phẩm: thuộc tính bắt buộc, biến thể trùng, giá âm, phân trang, tìm tiếng Việt có/không dấu. Shop bị khóa hoặc sản phẩm bị ẩn không xuất hiện trong kết quả mua được.
- [ ] Tạo danh mục phân cấp, định nghĩa thuộc tính có kiểu và kiểm tra phía máy chủ; dùng truy vấn tham số hóa và chỉ mục DB phù hợp, chưa thêm search engine riêng.
- [ ] Nối Seller chỉnh sản phẩm, Admin duyệt, trang shop/sản phẩm, filter và URL chia sẻ; bản ghi cũ vẫn truy vết được khi ngừng bán.
- [ ] Chạy `npm run test -- tests/integration/catalog.test.ts` và typecheck.

### Task 5: Ảnh/video và tác vụ nền bền vững

**Files:** Create `db/migrations/004_media_jobs.sql`, `src/modules/media/service.ts`, `src/server/jobs.ts`, `src/server/worker.ts`, `src/app/api/media/route.ts`, `src/app/api/webhooks/media/route.ts`, `tests/integration/media.test.ts`.
**Interfaces:** `requestUpload(actor, input: UploadInput): Promise<UploadTicket>`, `getReadyMedia(actor, mediaIds: Id[]): Promise<Media[]>`; trạng thái `pending | processing | ready | rejected`. `enqueueJob(kind: string, key: string, payload: unknown): Promise<void>` dùng khóa duy nhất; handler không xử lý trùng tác dụng nghiệp vụ.
- [ ] Test upload vượt giới hạn bị chặn, MIME giả không được xuất bản, callback giả/lặp không đổi sai trạng thái, media người khác không gắn được; worker chết giữa chừng sẽ chạy lại thay vì mất job.
- [ ] Nối kho/media service được chọn; upload trực tiếp qua URL ký ngắn hạn, kiểm tra file phía dịch vụ, chuyển mã video trước phát hành. Giới hạn thử nghiệm được ghi là cấu hình, không là giới hạn sản phẩm do khách đã chốt.
- [ ] Worker claim job có lease/retry giới hạn, backoff và hàng lỗi để vận hành xem; không gọi provider trong giao dịch DB dài. Xử lý media mồ côi theo lịch và trạng thái tham chiếu.
- [ ] Chạy `npm run test -- tests/integration/media.test.ts`, thử một ảnh và một video thật trong sandbox; lưu kết quả không chứa khóa.

### Task 6: Giỏ hàng, phí giao và tạo đơn nhiều shop

**Files:** Create `db/migrations/005_checkout.sql`, `src/modules/checkout/service.ts`, `src/app/(account)/cart/page.tsx`, `src/app/(account)/checkout/page.tsx`, `tests/integration/checkout.test.ts`.
**Interfaces:** `quoteCart(actor, input: CartInput): Promise<CheckoutQuote>`, `createCheckout(actor, input: CheckoutInput, idempotencyKey: string): Promise<Checkout>`; Checkout có id, tổng tiền, các ShopOrder và hạn giữ hàng. Client gửi variantId/quantity/address, không quyết định giá/phí/shopId.
- [ ] Test giỏ hai shop tạo hai đơn con, phí theo từng shop, tổng cộng khớp; hai khách mua đơn vị cuối chỉ một người giữ được. Giá thay đổi yêu cầu khách xác nhận lại; request lặp không tạo trùng checkout.
- [ ] Khóa tồn theo thứ tự ID trong transaction; lưu snapshot giá/thuộc tính/phí/chính sách, giữ hàng có hạn và giải phóng qua worker. Địa chỉ và dữ liệu liên hệ được kiểm tra, không log thô.
- [ ] Nối giỏ và checkout: hiện tổng tiền cuối trước trả tiền, lỗi vùng không giao được, hàng hết hoặc biến thể ngừng bán.
- [ ] Chạy `npm run test -- tests/integration/checkout.test.ts` với PostgreSQL thật cho ca đồng thời; typecheck.

### Task 7: Thanh toán thực và sự kiện đến muộn

**Files:** Create `db/migrations/006_payments.sql`, `src/modules/payments/service.ts`, `src/server/providers/payment.ts`, `src/app/api/webhooks/payment/route.ts`, `src/app/(account)/checkout/[id]/page.tsx`, `tests/integration/payments.test.ts`.
**Interfaces:** `startPayment(actor, checkoutId: Id): Promise<{ redirectUrl: string }>`, `handlePaymentWebhook(rawBody: Uint8Array, headers: Headers): Promise<void>`; provider event được map về payment reference, event ID, amount, currency và trạng thái xác thực.
- [ ] Test chữ ký sai/số tiền sai/currency sai bị từ chối; callback thành công lặp ghi nhận một lần; sự kiện thất bại cũ không hạ trạng thái đã thanh toán. Redirect quay về không tự đánh dấu paid.
- [ ] Test paid đến sau hạn giữ hàng: thử cấp lại tồn nguyên tử; nếu không thể, tạo trường hợp cần hoàn tiền và thông báo, không giao vượt tồn hoặc bỏ qua khoản đã thu.
- [ ] Nối provider được Task 1 kiểm chứng; lưu sự kiện đã nhận và trạng thái trong transaction, trả webhook nhanh rồi xử lý nền. Có job đối chiếu trạng thái khi callback thất lạc; retry outbound không tạo khoản thu trùng.
- [ ] Chạy `npm run test -- tests/integration/payments.test.ts`; thực hiện sandbox thành công/thất bại/timeout theo tài liệu provider. Chưa có credentials thì ghi blocked riêng tích hợp, không báo đã thanh toán thật.

### Task 8: Giao nhận, khiếu nại, hoàn tiền và đánh giá

**Files:** Create `db/migrations/007_fulfillment_returns.sql`, `src/modules/orders/service.ts`, `src/modules/returns/service.ts`, `src/modules/reviews/service.ts`, `src/app/seller/orders/page.tsx`, `src/app/(account)/orders/[id]/page.tsx`, `src/app/admin/disputes/page.tsx`, `tests/integration/orders.test.ts`.
**Interfaces:** `transitionOrder(actor, orderId: Id, action: OrderAction): Promise<void>`, `requestReturn(actor, input: ReturnInput): Promise<Id>`, `approveRefund(actor, caseId: Id, amount: Money): Promise<Id>`, `submitReview(actor, orderItemId: Id, input: ReviewInput): Promise<Id>`.
- [ ] Test shop chỉ cập nhật đơn mình; tracking không tự làm đủ điều kiện chi trả; người mua chỉ xác nhận đơn mình; hủy/đổi trả theo phiên bản chính sách của đơn. Người chưa mua không gửi đánh giá xác thực.
- [ ] Test hoàn một phần không vượt số lượng/tiền còn lại, callback hoàn lặp không hoàn hai lần; refund mới không phát sinh trên khoản đã đưa vào payout đang chạy mà không có cơ chế thu hồi/nguồn bù được ghi rõ.
- [ ] Nối UI giao hàng, bằng chứng, xác nhận nhận, tranh chấp và hoàn tiền; retry lỗi provider giữ trạng thái đang xử lý, không báo refunded khi mới gửi yêu cầu. Chỉ bộ phận có quyền xem bằng chứng nhạy cảm.
- [ ] Chạy `npm run test -- tests/integration/orders.test.ts` và sandbox hoàn một phần; typecheck.

### Task 9: Sổ tài chính và đối soát hàng tuần

**Files:** Create `db/migrations/008_ledger_settlements.sql`, `src/modules/finance/service.ts`, `src/app/seller/finance/page.tsx`, `src/app/admin/settlements/page.tsx`, `tests/integration/finance.test.ts`; Modify `src/modules/payments/service.ts`, `src/modules/orders/service.ts`, `src/modules/returns/service.ts` để nối các sự kiện tài chính.
**Interfaces:** `recordLedgerEvent(input: LedgerEvent): Promise<void>`, `prepareSettlement(actor, shopId: Id, cutoff: string): Promise<Id>`, `approveSettlement(actor, settlementId: Id): Promise<void>`, `recordPayout(actor, settlementId: Id, evidenceId: Id, bankReference: string): Promise<void>`.
- [ ] Test tổng phải trả khớp tiền hàng/vận chuyển/phí/hoàn, làm tròn phí theo quy tắc đã công bố; nguồn sự kiện lặp chỉ ghi một lần; hai tiến trình chuẩn bị đợt không chi cùng khoản.
- [ ] Test refund và chuẩn bị payout đồng thời: khóa cùng khoản theo cùng thứ tự; khoản tranh chấp bị loại; payout đã xác nhận không bị sửa lịch sử, tạo điều chỉnh và cảnh báo xử lý nếu hoàn sau payout.
- [ ] Sổ bút toán bất biến và cân đối theo từng sự kiện, tách pending/eligible/reserved/paid. Payout duyệt và thực hiện thủ công có bằng chứng; chưa rõ chuyển tiền thành công thì ở trạng thái cần đối chiếu, không retry mù.
- [ ] Gắn ghi sổ vào giao dịch DB của thanh toán, xác nhận nhận hàng và hoàn tiền; ID sự kiện là khóa chống trùng. Trước khi mở bán, dữ liệu sandbox từ task trước được đối chiếu hoặc tạo lại bằng fixture; không bỏ sót tiền vì sổ được thêm sau module giao dịch.
- [ ] Chạy `npm run test -- tests/integration/finance.test.ts`, kiểm tra báo cáo một bộ đơn tổng hợp có hủy/hoàn/tranh chấp, typecheck.

### Task 10: Hồ sơ, bài ảnh/video, feed và tương tác

**Files:** Create `db/migrations/009_social.sql`, `src/modules/social/service.ts`, `src/modules/social/queries.ts`, `src/app/(public)/feed/page.tsx`, `src/app/(public)/posts/[id]/page.tsx`, `src/app/(public)/users/[id]/page.tsx`, `src/app/(account)/posts/new/page.tsx`, `tests/integration/social.test.ts`.
**Interfaces:** `createPost(actor, input: PostInput): Promise<Id>`, `listFeed(actor: Actor | null, input: FeedQuery): Promise<Page<PostCard>>`, `interact(actor, input: SocialAction): Promise<void>`; PostInput chỉ gồm media ready thuộc chủ đăng, nội dung và productIds công khai hợp lệ.
- [ ] Test tạo bài ảnh/video, gắn nhiều sản phẩm, follow, like, comment, save; thao tác lặp không nhân like/follow; phân trang không lặp/bỏ bài khi cùng timestamp. Chặn nhau loại tương tác và feed theo chính sách.
- [ ] Tạo feed theo dõi theo thời gian và khám phá bằng chủ đề/tín hiệu sẵn có; sanitize nội dung và không render HTML tùy ý; không huấn luyện hệ thống đề xuất riêng.
- [ ] Hoàn thiện trang hồ sơ, composer trạng thái upload/xử lý, bài chi tiết, lưu bài và metadata chia sẻ; xóa/ẩn bài không xóa lịch sử đơn mua qua bài.
- [ ] Chạy `npm run test -- tests/integration/social.test.ts` và typecheck.

### Task 11: Kiểm duyệt và liên kết sản phẩm xuyên Social

**Files:** Create `db/migrations/010_moderation.sql`, `src/modules/moderation/service.ts`, `src/app/admin/moderation/page.tsx`, `tests/integration/moderation.test.ts`; Modify `src/modules/social/queries.ts`, `src/modules/catalog/queries.ts`.
**Interfaces:** `reportContent(actor, input: ReportInput): Promise<Id>`, `moderate(actor, reportId: Id, decision: ModerationDecision): Promise<void>`, `isPubliclyVisible(kind: string, id: Id): Promise<boolean>`.
- [ ] Test bài/sản phẩm bị ẩn biến mất khỏi feed/tìm kiếm; thẻ sản phẩm trong bài cũ hiện ngừng bán, không giữ CTA mua được. Vai trò hỗ trợ không tự có quyền kiểm duyệt hoặc sửa phí.
- [ ] Nối report bài/bình luận/shop/người dùng, hàng đợi duyệt và quyết định có lý do/audit; quyền xem dữ liệu riêng và bằng chứng tách riêng. Khi ẩn nội dung, lập lại chỉ mục/xóa cache công khai liên quan.
- [ ] Kiểm thử `npm run test -- tests/integration/moderation.test.ts`; kiểm tra một liên kết đã chia sẻ trước khi ẩn vẫn tôn trọng quyền mới.

### Task 12: Chat cá nhân và thông báo

**Files:** Create `db/migrations/011_chat_notifications.sql`, `src/modules/chat/service.ts`, `src/modules/notifications/service.ts`, `src/app/(account)/messages/[id]/page.tsx`, `src/app/api/chat/events/route.ts`, `tests/integration/chat.test.ts`.
**Interfaces:** `openConversation(actor, peerId: Id): Promise<Id>`, `sendMessage(actor, input: MessageInput, clientMessageId: string): Promise<Id>`, `listMessages(actor, conversationId: Id, cursor?: string): Promise<Page<Message>>`; MessageInput hỗ trợ text/image/post/product/order reference, kiểm tra quyền từng reference.
- [ ] Test người ngoài không đọc/gửi/subscribe; gửi lại clientMessageId chỉ một tin; thứ tự ổn định và unread đúng; chặn người dùng cấm gửi mới. Đính kèm đơn của người khác không lộ thông tin qua preview.
- [ ] Lưu tin trước, phát sự kiện qua SSE với polling dự phòng khi hạ tầng không duy trì kết nối. Kiểm tra session/quyền khi reconnect và khi phát dữ liệu, logout thu hồi stream; không chỉ xác thực lúc mở kết nối.
- [ ] Dùng worker gửi thông báo giao dịch/email, bảng unread là nguồn sự thật; retry không gửi trùng thông báo nghiệp vụ. Không đẩy toàn bộ nội dung chat/địa chỉ vào push mặc định.
- [ ] Chạy `npm run test -- tests/integration/chat.test.ts`; thử hai phiên trình duyệt gửi/đọc/reconnect và logout.

### Task 13: AI mua sắm dựa trên dữ liệu thật

**Files:** Create `db/migrations/012_ai_lists.sql`, `src/modules/discovery/service.ts`, `src/modules/discovery/schema.ts`, `src/server/providers/ai.ts`, `src/app/(public)/discover/page.tsx`, `src/app/(account)/lists/[id]/page.tsx`, `tests/integration/discovery.test.ts`.
**Interfaces:** `discover(actor: Actor | null, input: DiscoveryInput): Promise<DiscoveryResult>`, `saveList(actor, input: SavedListInput): Promise<Id>`; DiscoveryResult gồm câu hỏi bổ sung hoặc nhóm nhu cầu với lý do, keyword, productIds và postIds đã xác minh. AI không có công cụ tạo đơn hoặc truy cập chat.
- [ ] Test nhu cầu du lịch/góc làm việc/chăm sóc cá nhân; nhà cung cấp được stub ở test để đầu ra xác định. Không có hàng thì chỉ nhóm/từ khóa; ID bịa bị loại; sản phẩm/ bài vừa bị ẩn không xuất hiện dù nằm trong kết quả tìm trước đó.
- [ ] Test mô tả sản phẩm chứa lệnh lấy dữ liệu riêng không được thực thi; ngân sách, giới hạn token, timeout/provider lỗi có phản hồi hữu ích, không tự chuyển thành gợi ý sai.
- [ ] Dùng AI phân tích ý định và từ khóa có cấu trúc; truy vấn catalog/Social có kiểm soát quyền, kiểm tra lại ID/giá/tồn phía máy chủ. Đo bộ câu hỏi tiếng Việt trước khi thêm vector/search service; không thêm nếu tìm kiếm hiện tại đạt bộ chấp nhận.
- [ ] Nối UI hỏi bổ sung, nhóm cần/tùy chọn, nguồn bài và sản phẩm, lưu/chỉnh danh sách và thêm món vào giỏ qua Task 6. Giới hạn dùng theo IP/account, ghi chi phí không ghi tùy tiện nội dung riêng.
- [ ] Chạy `npm run test -- tests/integration/discovery.test.ts`, chạy bộ câu hỏi đánh giá với provider thật trong sandbox và ghi kết quả/chi phí.

### Task 14: PWA, khả năng truy cập và cache an toàn

**Files:** Create `src/app/manifest.ts`, `public/sw.js`, `public/offline.html`, biểu tượng PNG 192/512, `src/modules/notifications/push.ts`, `src/app/api/push/route.ts`, `tests/e2e/pwa.spec.ts`; Modify `src/app/layout.tsx`, `src/app/(account)/settings/page.tsx`.
**Interfaces:** `subscribePush(actor, input: PushSubscriptionInput): Promise<void>`, `unsubscribePush(actor, endpoint: string): Promise<void>`; service worker chỉ precache tài nguyên tĩnh/offline page, không cache API/HTML có phiên hoặc giao dịch.
- [ ] Test manifest/icons/install điều kiện phù hợp, offline fallback, update worker, push được phép/từ chối, keyboard navigation và nhãn form.
- [ ] Test A xem đơn/chat → logout → B login → back/reload/offline: không xuất hiện dữ liệu A. Logout xóa trạng thái client, binding push/session và đóng stream; không replay mutation lúc online trở lại.
- [ ] Dùng manifest App Router và service worker platform; đăng ký theo HTTPS, xử lý cập nhật không ngắt checkout đang diễn ra. Không hiện nút cài đặt/thông báo như thể mọi trình duyệt đều hỗ trợ.
- [ ] Chạy `npm run test:e2e -- tests/e2e/pwa.spec.ts`; kiểm tra thực tế Chrome Android và Safari iOS trên thiết bị khả dụng, ghi rõ phần chưa có phần cứng.

### Task 15: Báo cáo vận hành, tài chính và nguồn chuyển đổi

**Files:** Create `src/modules/reporting/service.ts`, `src/app/admin/reports/page.tsx`, `src/app/seller/reports/page.tsx`, `tests/integration/reports.test.ts`; Modify `src/modules/checkout/service.ts`, `src/modules/discovery/service.ts`, `src/modules/social/service.ts`.
**Interfaces:** `getPlatformReport(actor, range: DateRange): Promise<PlatformReport>`, `getShopReport(actor, shopId: Id, range: DateRange): Promise<ShopReport>`; DateRange là khoảng UTC suy ra từ ngày Việt Nam; attribution lưu một nguồn gần nhất hợp lệ do server xác minh, mô tả rõ trong UI.
- [ ] Test doanh số khác doanh thu phí, khoản trả shop khác tiền đã nhận; đơn hoàn/hủy không tính trùng; shop A không thấy shop B; ranh giới ngày/tháng Việt Nam đúng.
- [ ] Ghi sự kiện xem bài, mở sản phẩm, mở AI và tạo đơn theo định nghĩa; chống request lặp làm nhân số đếm mua. Xuất CSV cho người có quyền, escape ô có thể bị diễn giải thành công thức.
- [ ] Hiển thị người dùng hoạt động, chuyển đổi theo nguồn, tìm kiếm không có kết quả và chi phí AI; không giả vờ attribution là quan hệ nhân quả hoặc ghi nhận được mọi lượt ngoài nền tảng.
- [ ] Chạy `npm run test -- tests/integration/reports.test.ts`, đối chiếu bộ dữ liệu Task 9; typecheck.

### Task 16: Vận hành, khôi phục và nghiệm thu toàn hành trình

**Files:** Create `tests/e2e/launch.spec.ts`, `tests/integration/recovery.test.ts`, `docs/operations/runbook.md`, `docs/operations/launch-checklist.md`, cấu hình CI cho nền tảng repo được chọn; Modify cấu hình triển khai sau khi đã có hạ tầng mục tiêu.
**Interfaces:** Health/readiness từ Task 1; job failure visibility từ Task 5; số dư/đối soát từ Task 9. Không tạo hệ thống giám sát tự viết nếu hạ tầng có sẵn.
- [ ] E2E: Admin duyệt hai shop → shop tạo sản phẩm thuộc nhiều ngành → người dùng đăng ảnh/video gắn sản phẩm → người khác tìm qua AI/bài → chat → thanh toán hai shop → giao/nhận → hoàn một phần → đối soát → báo cáo khớp.
- [ ] Kiểm tra sửa ID vượt quyền xuyên các API, đầu vào độc hại/XSS/upload, khóa quyền khi session đang mở, rate limit, log không chứa bí mật; dùng test nghiệp vụ từ các task thay vì nhân đôi toàn bộ.
- [ ] Chạy khôi phục backup trong môi trường riêng và diễn tập worker dừng/retry, callback mất/lặp, AI/media lỗi. Ghi cách tạm dừng checkout và payout khi phát hiện sai lệch, không xóa dữ liệu để sửa số.
- [ ] Chốt với chủ sản phẩm mức tải đồng thời, dung lượng media và ngân sách; thử tải theo chính mức đã chốt, ghi p95/error rate/chi phí. Không tự tuyên bố chịu được một quy mô chưa thử.
- [ ] Chạy `npm run test`, `npm run typecheck`, `npm run build`, `npm run test:e2e`; CI phải xanh, không dùng credentials production trong test.
- [ ] Checklist mở bán bắt buộc: chính sách công bố, phạm vi ngành hàng, provider hỗ trợ mô hình và môi trường thật, cấu hình nhận tiền/chi trả, người trực hỗ trợ/kiểm duyệt/tài chính, sao lưu/giám sát. Thu thập xác nhận còn thiếu ở bước cuối khi mọi thứ đã review được; chưa tự triển khai production hoặc chuyển tiền thật trong kế hoạch này.

## Tự rà soát kế hoạch

- Bao phủ spec: vai trò/quyền (2–3), catalog đa ngành (4), media (5), giao dịch và hoàn/đối soát (6–9), Social (10–11), chat (12), AI (13), PWA (14), báo cáo (15), nghiệm thu và vận hành (16).
- Các trường hợp trong Review Focus đều có kiểm tra được gắn vào task sở hữu.
- Task sau chỉ dùng interface do task trước khai báo; `Actor`, `Money`, `Page` và lỗi dùng chung không tạo bản sao theo module.
- Không ghi ngày hoàn thành/chi phí chưa có căn cứ; không coi việc viết kế hoạch là đã chạy test hoặc đã kiểm chứng tích hợp.
- Dự án chưa có Git ở thời điểm lập kế hoạch; tài liệu hiện được lưu trên đĩa, chưa có commit.

## Tài liệu kỹ thuật đã tham khảo

- Next.js: https://nextjs.org/docs/app/guides/progressive-web-apps
- PostgreSQL khóa hàng và deadlock: https://www.postgresql.org/docs/current/explicit-locking.html
- Better Auth PostgreSQL: https://www.better-auth.com/docs/adapters/postgresql
- Better Auth email/password: https://www.better-auth.com/docs/authentication/email-password

Đã tra tài liệu qua Context7 khi lập kế hoạch; phiên bản/API cụ thể phải khớp lockfile được chọn ở Task 1.
