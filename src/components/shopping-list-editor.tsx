"use client";
import { useState } from "react";
import { ActionForm } from "./action-form";
import { saveShoppingList } from "@/app/(account)/lists/actions";
type Item = {
  label: string;
  keyword?: string;
  productId?: string;
  checked: boolean;
};
export function ShoppingListEditor({
  id,
  title,
  items: initial,
}: {
  id?: string;
  title: string;
  items: Item[];
}) {
  const [items, setItems] = useState(initial);
  return (
    <ActionForm action={saveShoppingList} submitLabel="Lưu danh sách">
      <input type="hidden" name="id" value={id ?? ""} />
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <label>
        Tên danh sách
        <input
          name="title"
          defaultValue={title}
          minLength={2}
          maxLength={120}
          required
        />
      </label>
      {items.map((item, i) => (
        <div className="panel section" key={i}>
          <label>
            <input
              type="checkbox"
              checked={item.checked}
              onChange={(e) =>
                setItems(
                  items.map((x, j) =>
                    j === i ? { ...x, checked: e.target.checked } : x,
                  ),
                )
              }
            />{" "}
            Đã chuẩn bị: {item.label}
          </label>
          <label>
            Tên mục
            <input
              value={item.label}
              readOnly={Boolean(item.productId)}
              onChange={(e) =>
                setItems(
                  items.map((x, j) =>
                    j === i ? { ...x, label: e.target.value } : x,
                  ),
                )
              }
              maxLength={160}
              required
            />
          </label>
          {item.productId && (
            <button
              type="button"
              className="secondary"
              onClick={() =>
                setItems(
                  items.map((x, j) =>
                    j === i ? { ...x, productId: undefined } : x,
                  ),
                )
              }
            >
              Bỏ liên kết sản phẩm
            </button>
          )}
          <button
            type="button"
            className="secondary"
            onClick={() => setItems(items.filter((_, j) => j !== i))}
          >
            Bỏ mục
          </button>
        </div>
      ))}
      <button
        className="secondary"
        type="button"
        disabled={items.length >= 40}
        onClick={() =>
          setItems([...items, { label: "Mục mới", checked: false }])
        }
      >
        Thêm mục
      </button>
    </ActionForm>
  );
}
