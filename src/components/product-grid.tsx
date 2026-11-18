import Link from "next/link";
import type { ProductCard } from "@/modules/catalog/queries";
export function ProductGrid({ items }: { items: ProductCard[] }) {
  return (
    <div className="grid">
      {items.map((p) => (
        <article className="panel" key={p.id}>
          <p className="hint">{p.shopName}</p>
          <h2 style={{ fontSize: 22 }}>
            <Link href={`/products/${p.id}`}>{p.name}</Link>
          </h2>
          <p>
            <strong>{BigInt(p.price).toLocaleString("vi-VN")} ₫</strong>
          </p>
          <span className="status">
            {p.stock > 0 ? "Còn hàng" : "Tạm hết hàng"}
          </span>
        </article>
      ))}
    </div>
  );
}
