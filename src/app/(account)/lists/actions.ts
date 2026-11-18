"use server";
import { pageActor } from "@/server/page-access";
import { getList,saveList } from "@/modules/discovery/service";
import { actionError } from "@/server/action-error";
import type { ActionState } from "@/components/action-form";
import { redirect } from "next/navigation";
export async function saveShoppingList(
  _previous: ActionState,
  data: FormData,
): Promise<ActionState> {
  let id: string;
  try {
    id = await saveList(await pageActor(), {
      id: String(data.get("id") ?? "") || undefined,
      title: data.get("title"),
      items: JSON.parse(String(data.get("items") ?? "[]")),
    });
  } catch (e) {
    return actionError(e);
  }
  redirect(`/lists/${id}`);
}

export async function saveProductToList(_previous:ActionState,data:FormData):Promise<ActionState>{let id:string;try{const actor=await pageActor(),existing=String(data.get('listId')??'');const list=existing?await getList(actor,existing):null;id=await saveList(actor,{id:list?.id,title:list?.title??'Sản phẩm muốn mua',items:[...(list?.items??[]).map(({label,keyword,productId,checked})=>({label,keyword,productId,checked})),{label:'Sản phẩm',productId:String(data.get('productId')),checked:false}]});}catch(e){return actionError(e);}redirect(`/lists/${id}`);}
