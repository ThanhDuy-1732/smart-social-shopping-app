import Link from "next/link";
import type { ProductCard } from "@/modules/catalog/queries";

export function ProductGrid({ items }: { items: ProductCard[] }) {
  return (
    <div className="grid product-grid">
      {items.map((p) => (
        <article className="panel product-card" key={p.id}>
          {p.coverId ? (
            <Link
              className="product-card-photo"
              href={`/products/${p.id}`}
              aria-label={`Xem ${p.name}`}
            >
              <img src={`/media/${p.coverId}`} alt="" loading="lazy" />
            </Link>
          ) : (
            <div className="product-card-placeholder">
              <span className="hint">Chưa có ảnh</span>
            </div>
          )}
          <div className="product-card-body">
            <p className="hint">{p.shopName}</p>
            <h2>
              <Link href={`/products/${p.id}`}>{p.name}</Link>
            </h2>
            <p className="product-price">
              {BigInt(p.price).toLocaleString("vi-VN")} ₫
            </p>
            <span className="status">
              {p.stock > 0 ? "Còn hàng" : "Tạm hết hàng"}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
