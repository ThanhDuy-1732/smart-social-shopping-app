# Discover — gợi ý DeepSeek qua OpenCode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trang `/discover` dùng DeepSeek (`deepseek-v4.1-flash`) qua gateway OpenCode để sinh nhóm nhu cầu + từ khóa cho mọi câu hỏi tiếng Việt, catalog vẫn tra sản phẩm thật, fallback về template local khi AI lỗi.

**Architecture:** Module mới `src/modules/discovery/ai.ts` gọi HTTP OpenAI-compatible bằng `fetch` (không thêm SDK), trả `null` khi không có key hoặc bất kỳ lỗi nào → `discover()` trong `service.ts` dùng lại `localNeeds()` hiện có. Trang chỉ đổi dòng notice tĩnh.

**Tech Stack:** Next 16 server code, zod (đã có), native `fetch`, vitest.

**Spec:** `docs/superpowers/specs/2026-11-19-discover-deepseek-suggestions-design.md`

## Global Constraints

- Không thêm dependency nào. Node ≥ 22.13 (dùng được `AbortSignal.timeout`).
- Key `OPENCODE_API_KEY` chỉ đọc trong `src/modules/discovery/ai.ts`, server-side; không bao giờ vào client bundle, không commit (`.env*` đã gitignored trừ `.env.example`).
- **Test integration không bao giờ gọi endpoint AI thật:** `vitest.config.ts` xóa trắng `OPENCODE_API_KEY` khỏi env test; test muốn mô phỏng AI phải `vi.stubEnv` + stub `fetch`.
- Mọi lỗi AI (mạng, timeout 10s, JSON sai, schema sai, HTTP != 2xx) → `aiNeeds` trả `null`, không bao giờ ném lỗi ra ngoài `discover()`.
- Copy UI tiếng Việt, giọng như hiện tại.
- Không đổi behavior pipeline catalog (searchCatalog/getPublicProduct/listFeed/getPost, lọc budget/tồn kho) — chỉ thay nguồn `needs`.

## Review Focus

- AI trả quá 4 nhóm hoặc quá 5 từ khóa → phải bị cắt còn 4/5, không rơi vào fallback. *(Test "trims excess output" — Task 1.)*
- Endpoint AI chết / timeout → trang vẫn render gợi ý local, mode `local-keywords`. *(Tests Task 1 + Task 2.)*
- `content` không phải JSON hoặc `needs` rỗng → fallback, không crash. *(Test "invalid JSON" + "empty needs" — Task 1.)*
- Từ khóa AI vẫn đi qua pipeline catalog thật: sản phẩm ẩn/hết hàng/ngoài ngân sách không xuất hiện. *(Test Task 2 kết hợp test visibility hiện có.)*
- Đặt `DISCOVERY_AI_MODEL` khác giá trị mặc định → body request dùng model đó. *(Test "custom model" — Task 1.)*

---

### Task 1: AI client `aiNeeds`

**Files:**
- Create: `src/modules/discovery/ai.ts`
- Create: `tests/fixtures/ai.ts`
- Test: `tests/integration/discovery-ai.test.ts`

**Interfaces:**
- Consumes: không (module độc lập, không import db/service).
- Produces (Task 2 phụ thuộc):
  - `export type Need = { title: string; reason: string; optional: boolean; keywords: string[] }`
  - `export async function aiNeeds(query: string, budget?: string): Promise<{ needs: Need[]; question: string | null } | null>`
- Test helper `tests/fixtures/ai.ts`: `export function aiResponse(payload: unknown): { ok: true; json: () => Promise<{ choices: { message: { content: string } }[] }> }` — bọc payload thành body OpenAI-compatible.

- [ ] **Step 1: Write the failing tests** — `tests/integration/discovery-ai.test.ts` (không import db):

```ts
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

test("returns parsed needs and question, calling the OpenCode endpoint with the default model", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    aiResponse({ question: "Đi mấy ngày?", needs: [oneNeed] }),
  );
  vi.stubGlobal("fetch", fetchMock);
  const r = await aiNeeds("Tôi muốn đi Trung Quốc", "150000");
  expect(r).toEqual({ question: "Đi mấy ngày?", needs: [oneNeed] });
  const [url, init] = fetchMock.mock.calls[0];
  expect(String(url)).toBe("https://opencode.ai/inference/openai/v1/chat/completions");
  const body = JSON.parse(init.body);
  expect(body.model).toBe("deepseek-v4.1-flash");
  expect(body.messages.at(-1).content).toContain("Tôi muốn đi Trung Quốc");
  expect(body.messages.at(-1).content).toContain("150000");
  expect(init.headers.Authorization).toBe("Bearer test-key");
});

test("custom DISCOVERY_AI_MODEL overrides the model in the request body", async () => {
  vi.stubEnv("DISCOVERY_AI_MODEL", "deepseek-v4-pro");
  const fetchMock = vi.fn().mockResolvedValue(aiResponse({ question: null, needs: [oneNeed] }));
  vi.stubGlobal("fetch", fetchMock);
  await aiNeeds("Tôi cần góc làm việc");
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe("deepseek-v4-pro");
});
```

Thêm 4 test nữa cùng file, cùng style:

- `test("trims excess output to 4 needs and 5 keywords")` — payload 5 nhóm (mỗi nhóm 7 từ khóa) → kết quả 4 nhóm × 5 từ khóa, không `null`.
- `test("returns null when OPENCODE_API_KEY is unset")` — `vi.stubEnv("OPENCODE_API_KEY", "")`, fetch mock không được gọi, kết quả `null`.
- `test("returns null when the AI content is not JSON")` — stub fetch trả `{ ok: true, json: async () => ({ choices: [{ message: { content: "xin chào" } }] }) }` → `null`.
- `test("returns null when fetch fails or needs are empty")` — hai lời gọi: fetch reject → `null`; payload `{ question: null, needs: [] }` → `null`.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/integration/discovery-ai.test.ts`
Expected: FAIL — không import được `@/modules/discovery/ai`.

- [ ] **Step 3: Implement `src/modules/discovery/ai.ts` + `tests/fixtures/ai.ts`**

`ai.ts` — hằng số cố định:

```ts
const ENDPOINT = "https://opencode.ai/inference/openai/v1/chat/completions";
```

- Model: `process.env.DISCOVERY_AI_MODEL ?? "deepseek-v4.1-flash"`.
- `const systemPrompt` — copy chính xác:

```text
Bạn là trợ lý mua sắm tiếng Việt. Người dùng mô tả nhu cầu chuẩn bị cho một hoạt động. Trả về CHỈ JSON hợp lệ, không thêm chữ nào khác, theo mẫu: {"question": câu hỏi làm rõ ngắn bằng tiếng Việt hoặc null, "needs": mảng 1-4 nhóm cần chuẩn bị, mỗi nhóm gồm "title" (tối đa 60 ký tự), "reason" (lý do cần chuẩn bị, tối đa 160 ký tự), "optional" (boolean), "keywords" (mảng 2-5 từ khóa tiếng Việt để tìm sản phẩm, mỗi từ khóa tối đa 40 ký tự)}. Không gợi ý sản phẩm hay cửa hàng cụ thể, chỉ từ khóa.
```

- `aiNeeds`: key rỗng/thiếu → `return null` ngay (không fetch). Body: `model`, `messages: [{ role: "system", content: systemPrompt }, { role: "user", content: query + (budget ? `\nNgân sách tối đa mỗi món: ${budget} đồng.` : "") }]`, `temperature: 0.3`, `max_tokens: 1000`, `response_format: { type: "json_object" }`. Headers: `Authorization: Bearer ${key}`, `Content-Type: application/json`. `signal: AbortSignal.timeout(10000)`.
- Parse: `res.ok` phải true; lấy `choices[0].message.content`, `JSON.parse`, zod parse với schema dung nạp (`title` max 200, `reason` max 200, `keywords` mảng string min 1, `needs` min 1) rồi **cắt** còn 4 nhóm × 5 từ khóa, `title.slice(0, 60)`, `reason.slice(0, 160)`; `question` trim, chuỗi rỗng → `null`. Toàn thân hàm nằm trong `try/catch { return null }`.
- `tests/fixtures/ai.ts`: đúng helper như Interfaces nêu trên.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/integration/discovery-ai.test.ts`
Expected: PASS (6 test).

- [ ] **Step 5: Commit**

```bash
git add src/modules/discovery/ai.ts tests/fixtures/ai.ts tests/integration/discovery-ai.test.ts
git commit -m "feat(discovery): DeepSeek suggestions via OpenCode gateway"
```

### Task 2: Wire AI into `discover()` + chặn test gọi AI thật

**Files:**
- Modify: `vitest.config.ts:13` (dòng `env,`)
- Modify: `src/modules/discovery/service.ts` (dòng 14 import, 22–33 type, 125–126, 172–178 return)
- Test: `tests/integration/discovery.test.ts` (thêm 1 test cuối file)

**Interfaces:**
- Consumes: `aiNeeds`, `type Need` từ Task 1; helper `aiResponse` từ `tests/fixtures/ai.ts`.
- Produces: `DiscoveryResult["mode"]` mở rộng thành `"local-keywords" | "ai"`; `Need` type giờ import từ `./ai` (service không còn định nghĩa lại).

- [ ] **Step 1: Chặn env test gọi AI thật — sửa `vitest.config.ts`**

Đổi dòng `env,` thành:

```ts
// Integration tests must never reach the paid AI endpoint.
env: { ...env, OPENCODE_API_KEY: "" },
```

- [ ] **Step 2: Write the failing test** — thêm vào cuối `tests/integration/discovery.test.ts` (import thêm `vi` từ vitest và `aiResponse` từ `../fixtures/ai`):

```ts
test("AI suggestions replace templates when configured, with fallback on failure", async () => {
  vi.stubEnv("OPENCODE_API_KEY", "test-key");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      aiResponse({
        question: "Bạn đi mấy ngày?",
        needs: [
          {
            title: "Hành lý chuyến đi",
            reason: "Chọn theo thời gian và quy định hãng.",
            optional: false,
            keywords: ["vali xịn", "túi đựng đồ"],
          },
        ],
      }),
    ),
  );
  const ai = await discover(f.buyer, {
    query: "Chuyến đi Đà Lạt cuối tuần",
    budget: "150000",
  });
  expect(ai.mode).toBe("ai");
  expect(ai.question).toBe("Bạn đi mấy ngày?");
  expect(ai.groups).toHaveLength(1);
  expect(ai.groups[0].keywords).toContain("vali xịn");
  expect(
    ai.groups.flatMap((g) => g.products).every((x) => BigInt(x.price) <= 150000n),
  ).toBe(true);
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("gateway down")));
  const fallback = await discover(f.buyer, { query: "Chuyến đi Đà Lạt cuối tuần" });
  expect(fallback.mode).toBe("local-keywords");
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run tests/integration/discovery.test.ts`
Expected: FAIL — mode luôn là `"local-keywords"` (chưa wire).

- [ ] **Step 4: Implement trong `service.ts`**

- Xóa định nghĩa `type Need` (dòng 22–27), import `{ aiNeeds, type Need } from "./ai"`.
- `DiscoveryResult["mode"]` → `"local-keywords" | "ai"`.
- Trong `discover()`, thay dòng 125–126 `const { query, budget } = parsed.data, { needs, question } = localNeeds(query);` bằng:

```ts
const { query, budget } = parsed.data,
  ai = await aiNeeds(query, budget),
  { needs, question } = ai ?? localNeeds(query);
```

- Return (dòng 172–178):

```ts
mode: ai ? "ai" : "local-keywords",
notice: ai
  ? "Gợi ý do AI đề xuất; giá và tồn kho lấy từ sản phẩm đang bán. Ngân sách lọc giá từng món, chưa phải tổng chi phí cả danh sách."
  : "Gợi ý local theo mẫu và từ khóa. Chưa kết nối AI; giá và tồn kho lấy từ sản phẩm đang bán. Ngân sách lọc giá từng món, chưa phải tổng chi phí cả danh sách.",
```

Phần duyệt nhóm/tra sản phẩm bên dưới giữ nguyên — tự nhận `needs` mới.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/integration/discovery.test.ts`
Expected: PASS (5 test cũ + 1 mới).

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts src/modules/discovery/service.ts tests/integration/discovery.test.ts
git commit -m "feat(discovery): use AI suggestions with local fallback"
```

### Task 3: Trang, env files, smoke test với key thật

**Files:**
- Modify: `src/app/(public)/discover/page.tsx:54-56` (xóa `<p className="notice">` tĩnh)
- Modify: `.env.example` (thêm 2 dòng placeholder)
- Modify: `.env.local` (thêm key thật — KHÔNG commit, đã gitignored)

**Interfaces:**
- Consumes: notice động `result.notice` đã hiển thị sẵn ở trang (dòng 69) — trang không cần biết mode.

- [ ] **Step 1: Xóa notice tĩnh trong `page.tsx`**

Xóa cả khối:

```tsx
<p className="notice">
  Chế độ local theo mẫu và từ khóa. AI chưa được kết nối.
</p>
```

- [ ] **Step 2: Cập nhật env files**

`.env.example` — thêm cuối file:

```text
# Discovery suggestions: OpenCode gateway (pay-as-you-go), model overridable.
OPENCODE_API_KEY=
DISCOVERY_AI_MODEL=deepseek-v4.1-flash
```

`.env.local` — thêm (dùng key do chủ dự án cung cấp, giá trị thật):

```text
OPENCODE_API_KEY=<key oc_sk_... của người dùng>
DISCOVERY_AI_MODEL=deepseek-v4.1-flash
```

- [ ] **Step 3: Typecheck + toàn bộ test discovery**

Run: `npm run typecheck && npx vitest run tests/integration/discovery.test.ts tests/integration/discovery-ai.test.ts`
Expected: typecheck sạch, PASS.

- [ ] **Step 4: Smoke test với key thật (chạy local, không phải test vitest)**

Run: `npm run dev` (background), chờ server lên ở `127.0.0.1:14388`, rồi:

```bash
curl -s "http://127.0.0.1:14388/discover?q=T%C3%B4i%20mu%E1%BB%91n%20%C4%91i%20Trung%20Qu%E1%BB%91c" | grep -o "do AI đề xuất"
```

Expected: thấy `do AI đề xuất` (mode `ai`, key thật hoạt động). Nếu thấy notice local → kiểm tra key/model trong `.env.local` và log server.

- [ ] **Step 5: Commit (không gồm .env.local)**

```bash
git add src/app/\(public\)/discover/page.tsx .env.example
git commit -m "feat(discover): surface AI suggestions notice, document env keys"
```

- [ ] **Step 6: Việc của chủ dự án (thủ công, ngoài code)**

Thêm `OPENCODE_API_KEY` + `DISCOVERY_AI_MODEL` vào Settings → Environment Variables của project trên Vercel, redeploy.
