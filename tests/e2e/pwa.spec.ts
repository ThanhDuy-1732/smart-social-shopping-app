import { test, expect } from "@playwright/test";
test("PWA has install assets and an offline page without caching private routes", async ({
  page,
  context,
}) => {
  const manifest = await (
    await page.request.get("/manifest.webmanifest")
  ).json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: "192x192", type: "image/png" }),
      expect.objectContaining({ sizes: "512x512", purpose: "any" }),
      expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
    ]),
  );
  for (const icon of manifest.icons) {
    const response = await page.request.get(icon.src);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
  }
  await page.goto("/");
  const appleIcon = page.locator('link[rel="apple-touch-icon"]');
  await expect(appleIcon).toHaveAttribute("sizes", "180x180");
  const appleHref = await appleIcon.getAttribute("href");
  expect((await page.request.get(appleHref!)).ok()).toBe(true);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.goto("/orders");
  await expect(
    page.getByRole("heading", { name: "Bạn đang ngoại tuyến" }),
  ).toBeVisible();
  expect(
    await page.evaluate(async () => {
      const values = [];
      for (const name of await caches.keys())
        for (const r of await (await caches.open(name)).keys())
          values.push(new URL(r.url).pathname);
      return values;
    }),
  ).not.toContain("/orders");
  await context.setOffline(false);
});
