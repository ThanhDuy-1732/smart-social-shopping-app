import { z } from "zod";

export type Need = {
  title: string;
  reason: string;
  optional: boolean;
  keywords: string[];
};

const ENDPOINT = "https://opencode.ai/inference/openai/v1/chat/completions";

const systemPrompt =
  'Bạn là trợ lý mua sắm tiếng Việt. Người dùng mô tả nhu cầu chuẩn bị cho một hoạt động. Trả về CHỈ JSON hợp lệ, không thêm chữ nào khác, theo mẫu: {"question": câu hỏi làm rõ ngắn bằng tiếng Việt hoặc null, "needs": mảng 1-4 nhóm cần chuẩn bị, mỗi nhóm gồm "title" (tối đa 60 ký tự), "reason" (lý do cần chuẩn bị, tối đa 160 ký tự), "optional" (boolean), "keywords" (mảng 2-5 từ khóa tiếng Việt để tìm sản phẩm, mỗi từ khóa tối đa 40 ký tự)}. Không gợi ý sản phẩm hay cửa hàng cụ thể, chỉ từ khóa.';

const tolerantSchema = z.object({
  question: z.string().trim().max(300).nullish(),
  needs: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(200),
        reason: z.string().trim().min(1).max(200),
        optional: z.boolean(),
        keywords: z.array(z.string().trim().min(1)).min(1),
      }),
    )
    .min(1),
});

export async function aiNeeds(
  query: string,
  budget?: string,
): Promise<{ needs: Need[]; question: string | null } | null> {
  const key = process.env.OPENCODE_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.DISCOVERY_AI_MODEL ?? "deepseek-v4.1-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content:
              query +
              (budget ? `\nNgân sách tối đa mỗi món: ${budget} đồng.` : ""),
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = tolerantSchema.parse(JSON.parse(content));
    return {
      question: parsed.question ? parsed.question.slice(0, 300) : null,
      needs: parsed.needs.slice(0, 4).map((need) => ({
        title: need.title.slice(0, 60),
        reason: need.reason.slice(0, 160),
        optional: need.optional,
        keywords: need.keywords.slice(0, 5).map((k) => k.slice(0, 40)),
      })),
    };
  } catch {
    return null;
  }
}
