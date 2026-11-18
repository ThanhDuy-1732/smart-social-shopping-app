import { test, expect } from "@playwright/test";
test("PWA has install assets and an offline page without caching private routes", async ({
  page,
  context,
}) => {
  const manifest = await (
    await page.request.get("/manifest.webmanifest")
  ).json();
  expect(manifest.display).toBe("standalone");
  for (const icon of manifest.icons)
    expect((await page.request.get(icon.src)).ok()).toBe(true);
  await page.goto("/");
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
