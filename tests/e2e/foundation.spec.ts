import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { Pool } from "pg";
import { loadEnv } from "vite";
import { totp } from "../fixtures/totp";
const env = loadEnv("test", process.cwd(), "");
const pool = new Pool({ connectionString: env.DATABASE_URL });
const emails: string[] = [];
const password = "A-secure-password-123!";
async function register(page: Page, name: string) {
  const email = `e2e-${randomUUID()}@example.test`;
  emails.push(email);
  await page.goto("/register");
  await page.getByLabel("Tên hiển thị").fill(name);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  const responsePromise=page.waitForResponse(r=>r.url().endsWith('/sign-up/email'));
  await page
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  const signupResponse=await responsePromise;
  if(signupResponse.status()===429){
    await new Promise(resolve=>setTimeout(resolve,(Number(signupResponse.headers()['x-retry-after'])||10)*1000+100));
    await page.getByRole('button',{name:'Tạo tài khoản',exact:true}).click();
  }

  await expect(page.getByRole("status")).toContainText("xác minh");
  const messages = await Promise.all(
    (await readdir(".local/mail")).map(async (f) =>
      JSON.parse(await readFile(`.local/mail/${f}`, "utf8")),
    ),
  );
  const message = messages.find(
    (m) => m.to === email && m.subject.includes("Xác minh"),
  );
  await page.goto(message.text.match(/https?:\/\/\S+/)[0]);
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  return email;
}
test.afterAll(async () => {
  for (const email of emails) {
    await pool.query(
      'DELETE FROM checkout WHERE buyer_id IN (SELECT id FROM "user" WHERE email=$1)',
      [email],
    );
    await pool.query('DELETE FROM "user" WHERE email=$1', [email]);
  }
  await pool.query("DELETE FROM category WHERE name='Ngành thử E2E'");
  await pool.end();
});
test("registered seller submits application and an MFA admin reviews it", async ({
  page,
  browser,
}) => {
  const ownerEmail = await register(page, "Nhà bán thử");
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/access=denied/);
  await page.goto("/seller/onboarding");
  for (const [label, value] of [
    ["Tên gian hàng", "Shop thử E2E"],
    ["Giới thiệu", "Gian hàng kiểm tra đăng ký và duyệt."],
    ["Số điện thoại Việt Nam", "0901234567"],
    ["Họ tên cá nhân / tên pháp lý", "Nguyễn Văn Thử"],
    ["Địa chỉ gửi hàng", "12 đường thử, Hà Nội"],
    ["Ngân hàng", "Ngân hàng thử"],
    ["Số tài khoản", "0123456789"],
    ["Tên chủ tài khoản", "NGUYEN VAN THU"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel("Số điện thoại Việt Nam", { exact: true }).fill("123");
  await page
    .getByRole("button", { name: "Gửi hồ sơ xét duyệt", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Kiểm tra tên shop" }),
  ).toBeVisible();
  await expect(page.getByLabel("Tên gian hàng", { exact: true })).toHaveValue(
    "Shop thử E2E",
  );
  await page
    .getByLabel("Số điện thoại Việt Nam", { exact: true })
    .fill("0901234567");
  await page.getByRole("button", { name: "Gửi hồ sơ xét duyệt" }).click();
  await expect(page.getByText("Hồ sơ gian hàng đã được gửi")).toBeVisible();
  await page.goto("/seller");
  await expect(page.getByText("Đang xét duyệt", { exact: true })).toBeVisible();
  const context = await browser.newContext();
  const adminPage = await context.newPage();
  const adminEmail = await register(adminPage, "Quản trị thử");
  await adminPage.getByLabel("Mật khẩu hiện tại").fill(password);
  await adminPage
    .getByRole("button", { name: "Thiết lập xác thực hai bước" })
    .click();
  const secret = await adminPage.locator("code").textContent();
  expect(secret).toBeTruthy();
  await adminPage.getByLabel("Mã từ ứng dụng xác thực").fill(totp(secret!));
  await adminPage
    .getByRole("button", { name: "Xác nhận bật xác thực" })
    .click();
  await expect(
    adminPage.getByText("Đã bật xác thực hai bước.", { exact: true }),
  ).toBeVisible();
  await pool.query(
    "INSERT INTO user_role(user_id,role) SELECT id,'admin' FROM \"user\" WHERE email=$1",
    [adminEmail],
  );
  await adminPage.goto("/admin/policies");
  await adminPage.getByLabel(/Phí nền tảng/).fill("300");
  await adminPage
    .getByLabel("Thời hạn shop xác nhận đơn (giờ)", { exact: true })
    .fill("24");
  await adminPage
    .getByLabel("Thời hạn yêu cầu đổi trả (ngày)", { exact: true })
    .fill("7");
  await adminPage
    .getByLabel("Thời gian chờ đối soát sau nhận hàng (ngày)", { exact: true })
    .fill("7");
  await adminPage
    .getByRole("textbox", { name: "Điều kiện hủy đơn", exact: true })
    .fill("Hủy trước khi shop xác nhận đơn.");
  await adminPage
    .getByRole("textbox", {
      name: "Điều kiện đổi trả / hoàn tiền",
      exact: true,
    })
    .fill("Yêu cầu đổi trả khi hàng sai mô tả.");
  await adminPage
    .getByRole("textbox", {
      name: "Cách xác nhận giao hàng thành công",
      exact: true,
    })
    .fill("Khách xác nhận hoặc hỗ trợ kiểm tra.");
  await adminPage
    .getByRole("textbox", {
      name: "Quy định giao hàng và phí vận chuyển",
      exact: true,
    })
    .fill("Shop tự giao, phí công bố trước đặt hàng.");
  await adminPage
    .getByRole("button", { name: "Công bố chính sách mới", exact: true })
    .click();
  await expect(adminPage.getByRole("status")).toContainText("Đã công bố");
  await adminPage.goto("/admin/shops");
  const row = adminPage.getByRole("row").filter({ hasText: "Shop thử E2E" });
  await row
    .getByLabel("Lý do xét duyệt")
    .fill("Đã kiểm tra hồ sơ thử và thông tin nhận tiền");
  await row.getByRole("button", { name: "Lưu quyết định" }).click();
  await expect(row.getByText("Đã duyệt", { exact: true })).toBeVisible();
  await page.goto("/seller");
  await expect(page.getByText("Đã được duyệt", { exact: true })).toBeVisible();
  await adminPage.goto("/admin/categories");
  await adminPage
    .getByLabel("Tên danh mục", { exact: true })
    .fill("Ngành thử E2E");
  await adminPage
    .getByRole("button", { name: "Tạo danh mục", exact: true })
    .click();
  await expect(adminPage.getByRole("status")).toContainText("Đã tạo");
  await page.goto("/seller/products/new");
  await page
    .getByLabel("Tên sản phẩm", { exact: true })
    .fill("Sản phẩm kiểm tra E2E");
  await page
    .getByLabel("Mô tả", { exact: true })
    .fill("Mô tả sản phẩm kiểm tra đăng và duyệt.");
  await page
    .getByLabel("Ngành hàng", { exact: true })
    .selectOption({ label: "Ngành thử E2E" });
  await page.getByLabel("Mã SKU", { exact: true }).fill("SKU-" + randomUUID());
  await page.getByLabel("Tên biến thể", { exact: true }).fill("Bản tiêu chuẩn");
  await page.getByLabel("Giá (VND)", { exact: true }).fill("250000");
  await page.getByLabel("Tồn kho", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Lưu và gửi duyệt" }).click();
  await expect(page.getByRole("status")).toContainText("Đã lưu");
  await adminPage.goto("/admin/products");
  const productRow = adminPage
    .getByRole("row")
    .filter({ hasText: "Sản phẩm kiểm tra E2E" });
  await productRow.getByRole("button", { name: "Lưu quyết định" }).click();
  await expect(productRow.getByRole("status")).toContainText("Đã cập nhật");
  await page.goto("/search?q=Sản+phẩm+kiểm+tra+E2E");
  await page
    .getByRole("link", { name: "Sản phẩm kiểm tra E2E", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sản phẩm kiểm tra E2E" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Thêm vào giỏ", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Đã thêm");
  await page.goto("/seller/shipping");
  await page.getByLabel("Áp dụng toàn quốc").check();
  await page.getByLabel("Phí giao hàng (VND)", { exact: true }).fill("30000");
  await page.getByLabel("Số ngày giao dự kiến", { exact: true }).fill("3");
  await page
    .getByRole("button", { name: "Lưu phí giao hàng", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Đã lưu");
  await page.goto("/cart");
  await page.getByLabel("Tỉnh/thành nhận hàng", { exact: true }).fill("Hà Nội");
  await page
    .getByRole("button", { name: "Xem tổng tiền", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Xác nhận đặt hàng" }),
  ).toBeVisible();
  await page
    .getByLabel("Họ tên người nhận", { exact: true })
    .fill("Người nhận E2E");
  await page.getByLabel("Số điện thoại", { exact: true }).fill("0901234567");
  await page
    .getByLabel("Địa chỉ chi tiết", { exact: true })
    .fill("12 đường thử, phường thử, Hà Nội");
  await page
    .getByRole("button", {
      name: "Tạo đơn và tiếp tục thanh toán",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Thanh toán trực tuyến chưa được mở.", { exact: false }),
  ).toBeVisible();
  await page.goto("/settings");
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/seller");
  await expect(page).toHaveURL(/\/login$/);
  await context.close();
  expect(ownerEmail).not.toBe(adminEmail);
});
test("mobile registration form fits viewport and has accessible controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/register");
  await expect(
    page.getByRole("heading", { name: "Cùng chia sẻ điều hay" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel("Tên hiển thị").focus();
  await expect(page.getByLabel("Tên hiển thị")).toBeFocused();
});
test("private chat delivers between two sessions, rejects outsiders and reconnects", async ({
  page,
  browser,
}) => {
  const emailA = await register(page, "Người trò chuyện A");
  const otherContext = await browser.newContext(),
    other = await otherContext.newPage();
  const emailB = await register(other, "Người trò chuyện B");
  const ids = (
    await pool.query(
      'SELECT id,email FROM "user" WHERE email=ANY($1::text[])',
      [[emailA, emailB]],
    )
  ).rows;
  const b = ids.find((r) => r.email === emailB).id;
  await page.goto(`/messages?peer=${b}`);
  await expect(page).toHaveURL(/messages\/[a-f0-9-]+$/);
  const path = new URL(page.url()).pathname;
  await page
    .getByRole("textbox", { name: "Tin nhắn", exact: true })
    .fill("Xin chào từ phiên A");
  await page.getByRole("button", { name: "Gửi tin nhắn", exact: true }).click();
  await expect(page.getByRole("log")).toContainText("Xin chào từ phiên A");
  await other.goto(path);
  await expect(other.getByRole("log")).toContainText("Xin chào từ phiên A");
  await other
    .getByRole("textbox", { name: "Tin nhắn", exact: true })
    .fill("Đã nhận tin từ A");
  await other
    .getByRole("button", { name: "Gửi tin nhắn", exact: true })
    .click();
  await expect(page.getByRole("log")).toContainText("Đã nhận tin từ A");
  await expect(page.getByRole("log")).toContainText("Đã đọc");
  await other.reload();
  await expect(other.getByRole("log")).toContainText("Đã nhận tin từ A");
  const outsider = await browser.newContext();
  const outsiderPage = await outsider.newPage();
  expect(
    (
      await outsiderPage.request.get(
        `/api/chat/conversations/${path.split("/").pop()}`,
      )
    ).status(),
  ).toBe(401);
  expect(
    (
      await outsiderPage.request.get(
        `/api/chat/events?conversationId=${path.split("/").pop()}`,
      )
    ).status(),
  ).toBe(401);
  await outsider.close();
  await page.goto("/settings");
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(
    (
      await page.request.get(`/api/chat/conversations/${path.split("/").pop()}`)
    ).status(),
  ).toBe(401);
  await otherContext.close();
});
