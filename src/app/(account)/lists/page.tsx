import Link from "next/link";
import { pageActor } from "@/server/page-access";
import { listLists } from "@/modules/discovery/service";
import { ShoppingListEditor } from "@/components/shopping-list-editor";
export default async function Lists() {
  const lists = await listLists(await pageActor());
  return (
    <>
      <h1>Danh sách chuẩn bị</h1>
      {lists.length ? (
        lists.map((l) => (
          <p key={l.id}>
            <Link href={`/lists/${l.id}`}>{l.title}</Link>
          </p>
        ))
      ) : (
        <p>Chưa có danh sách đã lưu.</p>
      )}
      <section className="panel">
        <h2>Tạo danh sách</h2>
        <ShoppingListEditor title="Danh sách mới" items={[]} />
      </section>
    </>
  );
}
