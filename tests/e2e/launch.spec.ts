import { test, expect } from "@playwright/test";
test("public discovery works locally and unconfigured payment never reports success", async ({
  page,
}) => {
  await page.goto("/discover");
  await page
    .getByRole("textbox", { name: "Nhu cầu của bạn", exact: true })
    .fill("Tôi muốn đi Trung Quốc");
  await page.getByRole("button", { name: "Tìm gợi ý", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Hành lý và sắp xếp/ }),
  ).toBeVisible();
  await expect(
    page.getByText("Chế độ local theo mẫu và từ khóa. AI chưa được kết nối."),
  ).toBeVisible();
  expect(
    (
      await page.request.post("/api/webhooks/payment", {
        data: { status: "paid", amount: "100000" },
      })
    ).status(),
  ).toBe(503);
  expect(
    (
      await page.request.post("/api/media", {
        headers: { origin: "https://attacker.invalid" },
        data: { kind: "image", size: 1000 },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.get("/api/reports?from=2026-11-01&to=2026-11-18")
    ).status(),
  ).toBe(401);
});

test("the mobile home image loads and bottom navigation leads to discovery", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto("/");
  const photo = page.getByRole("img", { name: /Nhóm bạn đi chơi ở Đà Lạt/ });
  await expect(photo).toBeVisible();
  await expect
    .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
  const nav = page.getByRole("navigation", { name: "Điều hướng chính" });
  await expect(nav).toHaveCSS("position", "fixed");
  await expect(nav.getByRole("link", { name: "Trang chủ" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await nav.getByRole("link", { name: "Gợi ý" }).click();
  await expect(page).toHaveURL("/discover");
  await expect(nav.getByRole("link", { name: "Gợi ý" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(
    page.getByRole("textbox", { name: "Nhu cầu của bạn" }),
  ).toBeVisible();
});
