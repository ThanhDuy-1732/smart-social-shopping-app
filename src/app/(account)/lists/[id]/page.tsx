import Link from "next/link";
import { notFound } from "next/navigation";
import { pageActor } from "@/server/page-access";
import { getList } from "@/modules/discovery/service";
import { ShoppingListEditor } from "@/components/shopping-list-editor";
import { ActionForm } from "@/components/action-form";
import { addToCart } from "@/app/(account)/cart/actions";
import { DomainError } from "@/modules/shared/types";
export default async function List({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let list;
  try {
    list = await getList(await pageActor(), (await params).id);
  } catch (e) {
    if (e instanceof DomainError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  return (
    <>
      <Link href="/lists">← Danh sách đã lưu</Link>
      <h1>{list.title}</h1>
      <ShoppingListEditor
        id={list.id}
        title={list.title}
        items={list.items.map(({ label, keyword, productId, checked }) => ({
          label,
          keyword,
          productId,
          checked,
        }))}
      />
      <h2>Mua sắm từ danh sách</h2>
      {list.items.map((item, i) => (
        <article className="panel section" key={i}>
          <h3>{item.label}</h3>
          {item.product ? (
            <>
              <Link href={`/products/${item.product.id}`}>
                Xem {item.product.name}
              </Link>
              <ActionForm action={addToCart} submitLabel="Thêm vào giỏ">
                <label>
                  Biến thể
                  <select name="variantId">
                    {item.product.variants.map((v) => (
                      <option key={v.id} value={v.id} disabled={v.stock <= 0}>
                        {v.label} · {BigInt(v.price).toLocaleString("vi-VN")} ₫
                        · {v.stock > 0 ? "Còn hàng" : "Hết hàng"}
                      </option>
                    ))}
                  </select>
                </label>
                <input type="hidden" name="quantity" value="1" />
              </ActionForm>
            </>
          ) : (
            <>
              <p>
                {item.productId
                  ? "Sản phẩm không còn khả dụng. Hãy bỏ liên kết để chỉnh sửa."
                  : "Tìm sản phẩm theo từ khóa đã lưu."}
              </p>
              <Link
                href={`/search?q=${encodeURIComponent(item.keyword ?? item.label)}`}
              >
                Tìm sản phẩm phù hợp
              </Link>
            </>
          )}
        </article>
      ))}
    </>
  );
}
