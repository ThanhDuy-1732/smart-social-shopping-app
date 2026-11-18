'use server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { requireActor } from '@/modules/access/service';
import { publishProduct,setProductVisibility } from '@/modules/catalog/service';
import { actionError } from '@/server/action-error';
import type { ActionState } from '@/components/action-form';
export async function reviewProduct(_state:ActionState,data:FormData):Promise<ActionState>{try{const actor=await requireActor(await headers());const id=String(data.get('productId'));if(data.get('decision')==='publish')await publishProduct(actor,id);else await setProductVisibility(actor,id,false);revalidatePath('/admin/products');revalidatePath('/seller/products');revalidatePath('/search');revalidatePath(`/products/${id}`);return{success:'Đã cập nhật trạng thái sản phẩm.'};}catch(error){return actionError(error);}}
