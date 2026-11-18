import { optionalActor } from "@/server/optional-actor";
import { ReportForm } from "@/components/report-form";
import { getPublicReviews } from "@/modules/reviews/service";
import { ActionForm } from "@/components/action-form";
import { addToCart } from "@/app/(account)/cart/actions";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicProduct } from "@/modules/catalog/queries";
export const dynamic = "force-dynamic";
export default async function Product({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const product = await getPublicProduct((await params).id);
  if (!product) notFound();
  const actor = await optionalActor();
  const reviews = await getPublicReviews(product.id);
  return (
    <>
      <p>
        <Link href="/search">Mua sắm</Link> / {product.categoryName}
      </p>
      <div className="panel">
        <p>
          <Link href={`/shops/${product.shopId}`}>{product.shopName}</Link>
        </p>
        <h1>{product.name}</h1>
        <Link
          className="button secondary"
          href={`/messages?shop=${product.shopId}&kind=product&ref=${product.id}`}
        >
          Nhắn shop về sản phẩm
        </Link>
        <div className="grid">
          {product.media.map((m) =>
            m.kind === "image" ? (
              <img
                key={m.id}
                src={`/media/${m.id}`}
                alt={product.name}
                style={{ width: "100%", borderRadius: 12 }}
              />
            ) : (
              <video
                key={m.id}
                src={`/media/${m.id}`}
                controls
                preload="metadata"
                aria-label={product.name}
                style={{ width: "100%" }}
              />
            ),
          )}
        </div>
        <p className="metric">
          {BigInt(product.price).toLocaleString("vi-VN")} ₫
        </p>
        <p style={{ whiteSpace: "pre-wrap" }}>{product.description}</p>
        {actor && <ReportForm kind="product" targetId={product.id} />}
        <h2>Thông tin sản phẩm</h2>
        <dl>
          {Object.entries(product.attributes).map(([key, value]) => (
            <div key={key}>
              <dt className="muted">{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <h2>Biến thể</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Biến thể</th>
                <th>Giá</th>
                <th>Tồn kho</th>
              </tr>
            </thead>
            <tbody>
              {product.variants.map((v) => (
                <tr key={v.id}>
                  <td>{v.label}</td>
                  <td>{BigInt(v.price).toLocaleString("vi-VN")} ₫</td>
                  <td>
                    {v.stock > 0 ? (
                      <ActionForm action={addToCart} submitLabel="Thêm vào giỏ">
                        <input type="hidden" name="variantId" value={v.id} />
                        <label>
                          Số lượng
                          <input
                            type="number"
                            name="quantity"
                            min={1}
                            max={Math.min(99, v.stock)}
                            step={1}
                            defaultValue={1}
                            required
                          />
                        </label>
                      </ActionForm>
                    ) : (
                      "Tạm hết hàng"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <section className="panel section">
        <h2>Đánh giá từ người mua</h2>
        {reviews.length ? (
          reviews.map((r) => (
            <article key={r.id}>
              <strong>
                {r.name} · {r.rating}/5
              </strong>
              <p>{r.text}</p>
              {actor && <ReportForm kind="review" targetId={r.id} />}
            </article>
          ))
        ) : (
          <p className="muted">Chưa có đánh giá từ giao dịch đã nhận hàng.</p>
        )}
      </section>
    </>
  );
}
