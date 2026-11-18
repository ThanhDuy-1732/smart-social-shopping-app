'use server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireActor } from '@/modules/access/service';
import { createCheckout } from '@/modules/checkout/service';
import { actionError } from '@/server/action-error';
import type { ActionState } from '@/components/action-form';
export async function placeOrder(_state:ActionState,data:FormData):Promise<ActionState>{let id:string;try{const actor=await requireActor(await headers());const checkout=await createCheckout(actor,{address:{name:data.get('name'),phone:data.get('phone'),region:data.get('region'),line:data.get('line')},quoteToken:data.get('quoteToken')},String(data.get('requestKey')));id=checkout.id;}catch(error){return actionError(error);}redirect(`/checkout/${id}`);}
