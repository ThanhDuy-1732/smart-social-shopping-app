import { ZodError } from "zod";
import { DomainError } from "@/modules/shared/types";
import { getConfig } from "./config";
export function requireOrigin(request: Request) {
  if (
    request.headers.get("origin") !==
    new URL(getConfig().BETTER_AUTH_URL).origin
  )
    throw new DomainError("FORBIDDEN", "Yêu cầu không hợp lệ.");
}
export async function readLimitedBody(
  request: Request,
  maxBytes: number,
): Promise<Uint8Array> {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) {
        await reader.cancel();
        throw new DomainError("INVALID_INPUT", "Dung lượng yêu cầu quá lớn.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
export function apiError(error: unknown): Response {
  if (error instanceof SyntaxError || error instanceof ZodError)
    return Response.json(
      { error: "Dữ liệu gửi lên chưa hợp lệ." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  if (error instanceof DomainError) {
    const status = {
      UNAUTHENTICATED: 401,
      FORBIDDEN: 403,
      INVALID_INPUT: 400,
      NOT_FOUND: 404,
      CONFLICT: 409,
      PROVIDER_UNAVAILABLE: 503,
      RATE_LIMITED: 429,
    }[error.code];
    return Response.json(
      { error: error.message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
  console.error("API request failed", {
    name: error instanceof Error ? error.name : "UnknownError",
  });
  return Response.json(
    { error: "Chưa xử lý được yêu cầu." },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}
export function mediaResponse(
  bytes: Uint8Array,
  mime: string,
  range: string | null,
): Response {
  const headers: Record<string, string> = {
    "Content-Type": mime,
    "Cache-Control": "private, no-store",
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
  };
  if (!range)
    return new Response(new Uint8Array(bytes), {
      headers: { ...headers, "Content-Length": String(bytes.length) },
    });
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (!match[1] && !match[2]))
    return new Response(null, {
      status: 416,
      headers: { ...headers, "Content-Range": `bytes */${bytes.length}` },
    });
  const start = match[1]
    ? Number(match[1])
    : Math.max(0, bytes.length - Number(match[2]));
  const end = match[1]
    ? match[2]
      ? Math.min(Number(match[2]), bytes.length - 1)
      : bytes.length - 1
    : bytes.length - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    start >= bytes.length ||
    end < start
  )
    return new Response(null, {
      status: 416,
      headers: { ...headers, "Content-Range": `bytes */${bytes.length}` },
    });
  const part = bytes.slice(start, end + 1);
  return new Response(new Uint8Array(part), {
    status: 206,
    headers: {
      ...headers,
      "Content-Length": String(part.length),
      "Content-Range": `bytes ${start}-${end}/${bytes.length}`,
    },
  });
}
