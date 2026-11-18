import { pageActor } from "@/server/page-access";
import { searchCatalog } from "@/modules/catalog/queries";
import { PostComposer } from "@/components/post-composer";
export default async function NewPost() {
  await pageActor();
  const products = await searchCatalog({ limit: 50 });
  return (
    <>
      <h1>Chia sẻ trải nghiệm</h1>
      <p className="muted">
        Kể điều bạn đã trải nghiệm, thêm ảnh/video và gắn sản phẩm để mọi người
        tìm hiểu.
      </p>
      <div className="panel" style={{ maxWidth: 800 }}>
        <PostComposer products={products.items} />
      </div>
    </>
  );
}
