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
