import { recordDiscovery } from "@/modules/reporting/service";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/server/db";
import { consumeQuota } from "@/server/quota";
import { assertActiveActor } from "@/modules/access/service";
import { normalizeSearch } from "@/modules/catalog/schema";
import {
  searchCatalog,
  getPublicProduct,
  type ProductCard,
} from "@/modules/catalog/queries";
import { listFeed, getPost, type PostCard } from "@/modules/social/queries";
import { DomainError, type Actor } from "@/modules/shared/types";
const inputSchema = z.object({
  query: z.string().trim().min(3).max(300),
  budget: z
    .string()
    .regex(/^\d{1,12}$/)
    .optional(),
});
type Need = {
  title: string;
  reason: string;
  optional: boolean;
  keywords: string[];
};
export type DiscoveryResult = {
  mode: "local-keywords";
  notice: string;
  question: string | null;
  groups: (Need & { products: ProductCard[]; posts: PostCard[] })[];
};
// shortcut: deterministic keyword templates support local evaluation; configure and evaluate a real AI provider before claiming semantic recommendations.
function localNeeds(query: string): { needs: Need[]; question: string | null } {
  const q = normalizeSearch(query);
  if (/trung quoc|du lich|di choi|chuyen di/.test(q))
    return {
      question:
        "Bạn đi vào mùa nào, trong bao lâu và ưu tiên ngân sách bao nhiêu?",
      needs: [
        {
          title: "Hành lý và sắp xếp",
          reason:
            "Chọn kích thước hành lý theo thời gian đi và quy định hãng vận chuyển.",
          optional: false,
          keywords: ["vali", "túi du lịch"],
        },
        {
          title: "Nguồn điện và kết nối",
          reason:
            "Kiểm tra thiết bị đang có, loại ổ cắm và điều kiện sử dụng tại nơi đến trước khi mua.",
          optional: true,
          keywords: ["sạc dự phòng", "đầu chuyển"],
        },
        {
          title: "Trải nghiệm chuyến đi",
          reason:
            "Tham khảo bài chia sẻ rồi đối chiếu thông tin hiện hành cho hành trình của bạn.",
          optional: true,
          keywords: ["Trung Quốc", "du lịch"],
        },
      ],
    };
  if (/lam viec|ban hoc|goc hoc|van phong/.test(q))
    return {
      question: "Bạn đã có bàn, ghế và màn hình chưa?",
      needs: [
        {
          title: "Chỗ ngồi và ánh sáng",
          reason:
            "Ưu tiên sự thoải mái, kích thước phù hợp và ánh sáng tại góc làm việc.",
          optional: false,
          keywords: ["đèn bàn", "ghế"],
        },
        {
          title: "Sắp xếp bàn",
          reason: "Chọn theo thiết bị đang dùng để tránh mua phụ kiện trùng.",
          optional: true,
          keywords: ["giá đỡ", "bàn phím"],
        },
      ],
    };
  if (/cham soc|lam dep|duong da|my pham/.test(q))
    return {
      question:
        "Bạn đang tìm chăm sóc da, tóc hay cơ thể? Có thành phần nào cần tránh?",
      needs: [
        {
          title: "Chăm sóc cơ bản",
          reason:
            "Đọc thành phần, hướng dẫn sử dụng và chọn theo nhu cầu cá nhân; đây không phải tư vấn y tế.",
          optional: false,
          keywords: ["sữa rửa mặt", "dưỡng ẩm", "chống nắng"],
        },
      ],
    };
  return {
    question: "Bạn muốn chuẩn bị cho hoạt động nào và đã có những món gì?",
    needs: [
      {
        title: "Tìm theo nhu cầu của bạn",
        reason:
          "Kết quả khớp từ khóa bạn nhập; có thể sửa câu tìm kiếm để cụ thể hơn.",
        optional: false,
        keywords: [query],
      },
    ],
  };
}
export async function discover(
  actor: Actor | null,
  input: unknown,
): Promise<DiscoveryResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success)
    throw new DomainError(
      "INVALID_INPUT",
      "Nhập nhu cầu từ 3–300 ký tự và ngân sách bằng số đồng.",
    );
  if (actor) {
    await assertActiveActor(actor);
    await consumeQuota(actor.userId, "discovery", 10, 60);
  }
  const { query, budget } = parsed.data,
    { needs, question } = localNeeds(query);
  const groups: DiscoveryResult["groups"] = [];
  for (const need of needs) {
    const products = new Map<string, ProductCard>(),
      posts = new Map<string, PostCard>();
    for (const keyword of need.keywords) {
      for (const p of (
        await searchCatalog({ query: keyword, maxPrice: budget, limit: 6 })
      ).items)
        products.set(p.id, p);
      for (const p of (await listFeed(actor, { query: keyword, limit: 3 }))
        .items)
        posts.set(p.id, p);
    }
    const visibleProducts: ProductCard[] = [];
    for (const p of [...products.values()].slice(0, 6)) {
      const current = await getPublicProduct(p.id);
      if (current) {
        const available = current.variants.filter(
          (v) => v.stock > 0 && (!budget || BigInt(v.price) <= BigInt(budget)),
        );
        if (available.length)
          visibleProducts.push({
            ...current,
            price: available
              .reduce(
                (min, v) => (BigInt(v.price) < min ? BigInt(v.price) : min),
                BigInt(available[0].price),
              )
              .toString(),
            stock: available.reduce((sum, v) => sum + v.stock, 0),
          });
      }
    }
    const visiblePosts: PostCard[] = [];
    for (const p of [...posts.values()].slice(0, 3)) {
      const current = await getPost(actor, p.id);
      if (current) visiblePosts.push(current);
    }
    groups.push({ ...need, products: visibleProducts, posts: visiblePosts });
  }
  if (actor)
    await recordDiscovery(
      actor,
      groups.flatMap((g) => g.products.map((p) => p.id)),
    );
  return {
    mode: "local-keywords",
    notice:
      "Gợi ý local theo mẫu và từ khóa. Chưa kết nối AI; giá và tồn kho lấy từ sản phẩm đang bán. Ngân sách lọc giá từng món, chưa phải tổng chi phí cả danh sách.",
    question,
    groups,
  };
}
const itemSchema = z.object({
  label: z.string().trim().min(1).max(160),
  keyword: z.string().trim().max(160).optional(),
  productId: z.uuid().optional(),
  checked: z.boolean().default(false),
});
const listSchema = z.object({
  id: z.uuid().optional(),
  title: z.string().trim().min(2).max(120),
  items: z.array(itemSchema).max(40),
});
export async function saveList(actor: Actor, input: unknown): Promise<string> {
  await assertActiveActor(actor);
  const parsed = listSchema.safeParse(input);
  if (!parsed.success)
    throw new DomainError(
      "INVALID_INPUT",
      "Tên danh sách 2–120 ký tự, tối đa 40 mục.",
    );
  const v = parsed.data,
    id = v.id ?? randomUUID();
  for (const item of v.items)
    if (item.productId) {
      const p = await getPublicProduct(item.productId);
      if (!p)
        throw new DomainError(
          "CONFLICT",
          "Một sản phẩm đã ngừng hiển thị. Hãy bỏ liên kết sản phẩm trước khi lưu.",
        );
      item.label = p.name;
    }
  if (v.id) {
    const result = await db.query(
      "UPDATE shopping_list SET title=$3,items=$4,updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING id",
      [id, actor.userId, v.title, JSON.stringify(v.items)],
    );
    if (!result.rowCount)
      throw new DomainError("NOT_FOUND", "Không tìm thấy danh sách.");
  } else
    await db.query(
      "INSERT INTO shopping_list(id,user_id,title,items) VALUES($1,$2,$3,$4)",
      [id, actor.userId, v.title, JSON.stringify(v.items)],
    );
  return id;
}
export async function getList(actor: Actor, id: string) {
  await assertActiveActor(actor);
  const row = (
    await db.query<{
      id: string;
      title: string;
      items: z.infer<typeof itemSchema>[];
    }>("SELECT id,title,items FROM shopping_list WHERE id=$1 AND user_id=$2", [
      id,
      actor.userId,
    ])
  ).rows[0];
  if (!row) throw new DomainError("NOT_FOUND", "Không tìm thấy danh sách.");
  return {
    ...row,
    items: await Promise.all(
      row.items.map(async (item) => ({
        ...item,
        product: item.productId ? await getPublicProduct(item.productId) : null,
      })),
    ),
  };
}
// shortcut: The list index returns the latest 100 lists; add paging for longer histories.
export async function listLists(actor: Actor) {
  await assertActiveActor(actor);
  return (
    await db.query<{ id: string; title: string }>(
      "SELECT id,title FROM shopping_list WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 100",
      [actor.userId],
    )
  ).rows;
}
