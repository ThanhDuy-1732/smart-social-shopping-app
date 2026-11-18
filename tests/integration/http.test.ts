import { expect, test } from "vitest";
import { mediaResponse, readLimitedBody, requireOrigin } from "@/server/http";
test("media range serves requested bytes and rejects invalid offsets", async () => {
  const bytes = new Uint8Array([10, 20, 30, 40, 50]);
  const response = mediaResponse(bytes, "video/mp4", "bytes=1-3");
  expect(response.status).toBe(206);
  expect(response.headers.get("content-range")).toBe("bytes 1-3/5");
  expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([
    20, 30, 40,
  ]);
  expect(mediaResponse(bytes, "video/mp4", "bytes=9-").status).toBe(416);
  expect([
    ...new Uint8Array(
      await mediaResponse(bytes, "video/mp4", "bytes=-2").arrayBuffer(),
    ),
  ]).toEqual([40, 50]);
});
test("request streaming stops beyond the byte limit even without Content-Length", async () => {
  const request = new Request("http://127.0.0.1/upload", {
    method: "POST",
    body: "12345",
  });
  await expect(readLimitedBody(request, 4)).rejects.toMatchObject({
    code: "INVALID_INPUT",
  });
});
test("cross-origin mutations are rejected", () => {
  expect(() =>
    requireOrigin(
      new Request("http://127.0.0.1/upload", {
        headers: { origin: "https://attacker.invalid" },
      }),
    ),
  ).toThrow();
});

test("malformed JSON and schema violations return a safe client error", async () => {
  const { apiError } = await import("@/server/http");
  const { z } = await import("zod");
  expect(
    apiError(new SyntaxError("Unexpected token with private input")).status,
  ).toBe(400);
  const parsed = z.uuid().safeParse("invalid");
  expect(apiError(parsed.error).status).toBe(400);
});
