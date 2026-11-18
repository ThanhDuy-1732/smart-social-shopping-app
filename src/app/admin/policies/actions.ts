'use server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { requireActor } from '@/modules/access/service';
import { publishPolicy } from '@/modules/policies/service';
import { actionError } from '@/server/action-error';
import type { ActionState } from '@/components/action-form';
export async function submitPolicy(_state: ActionState,data:FormData): Promise<ActionState> {
  try {
    const actor=await requireActor(await headers());
    const value=Object.fromEntries(data);
    const numbers: Record<string,unknown>={};
    for(const key of ['commissionBps','returnDays','sellerAcceptHours','settlementHoldDays']) numbers[key]=value[key]==='' || value[key]==null ? undefined : Number(value[key]);
    await publishPolicy(actor,{...value,...numbers});
    revalidatePath('/admin/policies'); revalidatePath('/terms');
    return {success:'Đã công bố phiên bản chính sách mới. Đơn đã tạo giữ chính sách tại thời điểm đặt hàng.'};
  } catch(error) { return actionError(error); }
}
