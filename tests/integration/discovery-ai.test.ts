import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { aiNeeds } from "@/modules/discovery/ai";
import { aiResponse } from "../fixtures/ai";

const oneNeed = {
  title: "Hành lý",
  reason: "Chọn theo thời gian đi.",
  optional: false,
  keywords: ["vali", "túi du lịch"],
};

beforeEach(() => vi.stubEnv("OPENCODE_API_KEY", "test-key"));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

test("returns parsed needs and question, calling the OpenCode Go endpoint with the default model", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    aiResponse({ question: "Đi mấy ngày?", needs: [oneNeed] }),
  );
  vi.stubGlobal("fetch", fetchMock);
  const r = await aiNeeds("Tôi muốn đi Trung Quốc", "150000");
  expect(r).toEqual({ question: "Đi mấy ngày?", needs: [oneNeed] });
  const [url, init] = fetchMock.mock.calls[0];
  expect(String(url)).toBe(
    "https://opencode.ai/inference/go/openai/v1/chat/completions",
  );
  const body = JSON.parse(init.body);
  expect(body.model).toBe("deepseek-v4.1-flash");
  expect(body.reasoning_effort).toBe("none");
  expect(body.messages.at(-1).content).toContain("Tôi muốn đi Trung Quốc");
  expect(body.messages.at(-1).content).toContain("150000");
  expect(init.headers.Authorization).toBe("Bearer test-key");
  expect(init.headers["x-opencode-session"]).toMatch(
    /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/,
  );
});

test("custom DISCOVERY_AI_MODEL overrides the model in the request body", async () => {
  vi.stubEnv("DISCOVERY_AI_MODEL", "deepseek-v4-pro");
  const fetchMock = vi
    .fn()
    .mockResolvedValue(aiResponse({ question: null, needs: [oneNeed] }));
  vi.stubGlobal("fetch", fetchMock);
  await aiNeeds("Tôi cần góc làm việc");
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe(
    "deepseek-v4-pro",
  );
});

test("trims excess output to 4 needs and 5 keywords", async () => {
  const excess = Array.from({ length: 5 }, (_, i) => ({
    title: `Nhóm ${i + 1}`,
    reason: "Lý do",
    optional: false,
    keywords: Array.from({ length: 7 }, (_, j) => `từ khóa ${i}-${j}`),
  }));
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(aiResponse({ question: null, needs: excess })),
  );
  const r = await aiNeeds("Chuyến đi hè");
  expect(r).not.toBeNull();
  expect(r!.needs).toHaveLength(4);
  for (const need of r!.needs) expect(need.keywords).toHaveLength(5);
});

test("returns null when OPENCODE_API_KEY is unset", async () => {
  vi.stubEnv("OPENCODE_API_KEY", "");
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  expect(await aiNeeds("Tôi muốn đi Trung Quốc")).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});

test("returns null when the AI content is not JSON", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "xin chào" } }],
      }),
    }),
  );
  expect(await aiNeeds("Tôi muốn đi Trung Quốc")).toBeNull();
});

test("tolerates a missing question key and over-length keywords", async () => {
  const longKeyword = "một từ khóa dài hơn bốn mươi ký tự để kiểm tra dung nạp";
  expect(longKeyword.length).toBeGreaterThan(40);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      aiResponse({
        needs: [{ ...oneNeed, keywords: [longKeyword, "vali"] }],
      }),
    ),
  );
  const r = await aiNeeds("Tôi muốn đi Trung Quốc");
  expect(r).not.toBeNull();
  expect(r!.question).toBeNull();
  expect(r!.needs[0].keywords[0]).toHaveLength(40);
  expect(r!.needs[0].keywords[1]).toBe("vali");
});

test("returns null when fetch fails or needs are empty", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new Error("gateway down")),
  );
  expect(await aiNeeds("Tôi muốn đi Trung Quốc")).toBeNull();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(aiResponse({ question: null, needs: [] })),
  );
  expect(await aiNeeds("Tôi muốn đi Trung Quốc")).toBeNull();
});
