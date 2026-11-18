import { pageActor } from "@/server/page-access";
import { listCategories } from "@/modules/catalog/service";
import { CategoryForm } from "@/components/category-form";
export default async function Categories() {
  await pageActor("catalog.manage");
  const categories = await listCategories();
  return (
    <>
      <h1>Danh mục và thuộc tính</h1>
      <p className="muted">
        Mở ngành hàng và định nghĩa dữ liệu sản phẩm cần cung cấp.
      </p>
      <div className="two-col">
        <section className="panel">
          <h2>Danh mục hiện có</h2>
          {!categories.length ? (
            <p className="muted">
              Chưa có danh mục. Tạo ngành hàng đầu tiên để nhà bán đăng sản
              phẩm.
            </p>
          ) : (
            <ul>
              {categories.map((c) => (
                <li key={c.id}>
                  {c.name}
                  {c.parentId && (
                    <small>
                      {" "}
                      (thuộc {categories.find((p) => p.id === c.parentId)?.name}
                      )
                    </small>
                  )}
                  <p className="hint">
                    {c.attributes.map((x) => x.label).join(", ") ||
                      "Chưa có thuộc tính riêng"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="panel">
          <h2>Tạo danh mục</h2>
          <CategoryForm categories={categories} />
        </section>
      </div>
    </>
  );
}
