import { test, expect, type Page } from "@playwright/test";
import { Pool } from "pg";
import { loadEnv } from "vite";
import { randomUUID } from "node:crypto";
const env = loadEnv("test", process.cwd(), "");
if (!new URL(env.DATABASE_URL).pathname.endsWith("_test"))
  throw new Error("Dedicated test database required");
const pool = new Pool({ connectionString: env.DATABASE_URL }),
  users: string[] = [],
  categories: string[] = [];
const password = "A-secure-password-123!";
async function account(page: Page) {
  const email = `privacy-${randomUUID()}@example.test`;
  let response = await page.request.post("/api/auth/sign-up/email", {
    data: { email, name: "Người thử quyền", password },
  });
  if (response.status() === 429) {
    await new Promise((r) =>
      setTimeout(
        r,
        (Number(response.headers()["x-retry-after"]) || 10) * 1000 + 100,
      ),
    );
    response = await page.request.post("/api/auth/sign-up/email", {
      data: { email, name: "Người thử quyền", password },
    });
  }
  expect(response.ok()).toBe(true);
  const id = (await response.json()).user.id;
  users.push(id);
  await pool.query('UPDATE "user" SET "emailVerified"=true WHERE id=$1', [id]);
  return { id, email };
}
async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  const responsePromise = page.waitForResponse((r) =>
    r.url().endsWith("/sign-in/email"),
  );
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  const response = await responsePromise;
  if (response.status() === 429) {
    await new Promise((r) =>
      setTimeout(
        r,
        (Number(response.headers()["x-retry-after"]) || 10) * 1000 + 100,
      ),
    );
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  }
  await expect(page).toHaveURL(/settings$/);
}
test.afterAll(async () => {
  for (const id of users)
    await pool.query('DELETE FROM "user" WHERE id=$1', [id]);
  for (const id of categories)
    await pool.query("DELETE FROM category WHERE id=$1", [id]);
  await pool.end();
});
test("private selections on public product and saved feed disappear after another tab switches accounts", async ({
  page,
  context,
}) => {
  const a = await account(page),
    b = await account(page),
    category = randomUUID(),
    shop = randomUUID(),
    product = randomUUID(),
    post = randomUUID(),
    secret = "Danh sách riêng " + randomUUID();
  categories.push(category);
  await pool.query(
    "INSERT INTO category(id,name) VALUES($1,'Ngành thử riêng tư')",
    [category],
  );
  await pool.query(
    "INSERT INTO shop(id,owner_user_id,name,description,phone,address,status) VALUES($1,$2,'Shop kiểm tra','Shop dữ liệu kiểm tra','0901234567','Hà Nội','approved')",
    [shop, a.id],
  );
  await pool.query(
    "INSERT INTO product(id,shop_id,category_id,name,description,search_text,status) VALUES($1,$2,$3,'Món thử riêng tư','Sản phẩm công khai thử riêng tư','mon thu rieng tu','published')",
    [product, shop, category],
  );
  await pool.query(
    "INSERT INTO product_variant(id,product_id,shop_id,sku,label,price,stock) VALUES($1,$2,$3,$4,'Bản thử',100000,1)",
    [randomUUID(), product, shop, randomUUID()],
  );
  await pool.query(
    "INSERT INTO shopping_list(id,user_id,title,items) VALUES($1,$2,$3,'[]')",
    [randomUUID(), a.id, secret],
  );
  await pool.query(
    "INSERT INTO social_post(id,author_id,text,search_text) VALUES($1,$2,'Bài công khai được A lưu riêng','bai cong khai')",
    [post, b.id],
  );
  await pool.query("INSERT INTO post_save(user_id,post_id) VALUES($1,$2)", [
    a.id,
    post,
  ]);
  await login(page, a.email);
  await page.goto(`/products/${product}`);
  await page.getByText("Lưu sản phẩm vào danh sách", { exact: true }).click();
  await expect(
    page.getByRole("option", { name: secret, exact: true }),
  ).toHaveCount(1);
  const saved = await context.newPage();
  await saved.goto("/feed?mode=saved");
  await expect(
    saved.getByText("Bài công khai được A lưu riêng", { exact: true }),
  ).toBeVisible();
  const control = await context.newPage();
  await control.goto("/settings");
  await control.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(control).toHaveURL(/login$/);
  await login(control, b.email);
  await expect(
    page.getByRole("option", { name: secret, exact: true }),
  ).toHaveCount(0);
  await expect(
    saved.getByText("Bài công khai được A lưu riêng", { exact: true }),
  ).not.toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("option", { name: secret, exact: true }),
  ).toHaveCount(0);
  await saved.close();
  await control.close();
});
test("restored privileged content is hidden when the same user loses finance permission", async ({
  page,
}) => {
  const a = await account(page);
  await login(page, a.email);
  await pool.query('UPDATE "user" SET "twoFactorEnabled"=true WHERE id=$1', [
    a.id,
  ]);
  await pool.query("INSERT INTO user_role(user_id,role) VALUES($1,'finance')", [
    a.id,
  ]);
  await page.goto("/admin/reports");
  await expect(
    page.getByRole("heading", { name: "Báo cáo nền tảng", exact: true }),
  ).toBeVisible();
  await pool.query(
    "DELETE FROM user_role WHERE user_id=$1 AND role='finance'",
    [a.id],
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page).toHaveURL(/settings\?access=denied$/);
  await expect(
    page.getByRole("heading", { name: "Báo cáo nền tảng", exact: true }),
  ).not.toBeVisible();
});
