import Link from "next/link";
import type { ProductCard } from "@/modules/catalog/queries";

const money = (value: string) => `${BigInt(value).toLocaleString("vi-VN")} ₫`;

const tone = (id: string) => {
  let sum = 0;
  for (const character of id) sum += character.charCodeAt(0);
  return (sum % 6) + 1;
};

export function CatalogGrid({ items }: { items: ProductCard[] }) {
  return (
    <div className="d-products">
      {items.map((product) => (
        <article className="d-product" key={product.id}>
          <div className="d-product-media">
            <Link
              className="d-media-link"
              href={`/products/${product.id}`}
              aria-label={`Xem ${product.name}`}
            >
              {product.coverId ? (
                <img
                  src={`/media/${product.coverId}`}
                  alt=""
                  loading="lazy"
                />
              ) : (
                <span
                  className={`d-ph d-tone-${tone(product.id)}`}
                  aria-hidden="true"
                >
                  {product.name.slice(0, 1).toUpperCase()}
                </span>
              )}
            </Link>
            {product.stock === 0 ? (
              <span className="d-stamp out">Hết hàng</span>
            ) : product.stock <= 4 ? (
              <span className="d-stamp">Còn {product.stock}</span>
            ) : null}
          </div>
          <div className="d-product-body">
            <span className="d-shop">{product.shopName}</span>
            <h2>
              <Link href={`/products/${product.id}`}>{product.name}</Link>
            </h2>
            <div className="d-price">
              <b>{money(product.price)}</b>
              <span className={product.stock > 0 ? undefined : "out"}>
                {product.stock > 0 ? "còn hàng" : "hết hàng"}
              </span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
