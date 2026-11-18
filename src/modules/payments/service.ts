import { z } from 'zod';
import { createHash } from 'node:crypto';
import { db,withTransaction } from '@/server/db';
import { assertActiveActor } from '@/modules/access/service';
import { DomainError,type Actor } from '@/modules/shared/types';
import { requirePaymentProvider } from '@/server/providers/payment';
export async function startPayment(actor:Actor,checkoutId:string):Promise<{redirectUrl:string}>{
 await assertActiveActor(actor);
 const checkout=(await db.query('SELECT status FROM checkout WHERE id=$1 AND buyer_id=$2',[checkoutId,actor.userId])).rows[0];
 if(!checkout)throw new DomainError('NOT_FOUND','Không tìm thấy đơn hàng.');
 if(checkout.status!=='awaiting_payment')throw new DomainError('CONFLICT','Đơn không còn chờ thanh toán.');
 return requirePaymentProvider();
}
export async function handlePaymentWebhook(_rawBody:Uint8Array,_headers:Headers):Promise<void>{requirePaymentProvider();}
const eventSchema=z.object({eventId:z.string().min(1).max(200),providerReference:z.string().min(1).max(200),amount:z.string().regex(/^[1-9]\d{0,17}$/),currency:z.literal('VND'),status:z.enum(['paid','failed'])});
// Only a provider adapter after signature verification may call this; no public route accepts these objects.
export async function applyVerifiedPaymentEvent(input:unknown):Promise<void>{
 const parsed=eventSchema.safeParse(input);if(!parsed.success)throw new DomainError('INVALID_INPUT','Kết quả thanh toán không hợp lệ.');const event=parsed.data;
 const payloadHash=createHash('sha256').update(JSON.stringify(event)).digest('hex');
 const reference=(await db.query('SELECT checkout_id FROM payment_intent WHERE provider_reference=$1',[event.providerReference])).rows[0];if(!reference)throw new DomainError('NOT_FOUND','Không tìm thấy yêu cầu thanh toán.');
 await withTransaction(async client=>{
  const checkout=(await client.query('SELECT id,total::text,status,cancel_reason FROM checkout WHERE id=$1 FOR UPDATE',[reference.checkout_id])).rows[0];
  const payment=(await client.query('SELECT id,amount::text,currency,status FROM payment_intent WHERE provider_reference=$1 FOR UPDATE',[event.providerReference])).rows[0];
  if(!payment||BigInt(payment.amount)!==BigInt(event.amount)||payment.currency!==event.currency||BigInt(checkout.total)!==BigInt(event.amount))throw new DomainError('INVALID_INPUT','Số tiền hoặc loại tiền không khớp đơn hàng.');
  const existing=(await client.query('SELECT payload_hash FROM payment_event WHERE id=$1',[event.eventId])).rows[0];if(existing){if(existing.payload_hash!==payloadHash)throw new DomainError('CONFLICT','Mã sự kiện đã được dùng cho kết quả khác.');return;}
  await client.query('INSERT INTO payment_event(id,payment_id,payload_hash,status) VALUES($1,$2,$3,$4)',[event.eventId,payment.id,payloadHash,event.status]);
  if(payment.status==='paid')return;
  if(event.status==='failed'){await client.query("UPDATE payment_intent SET status='failed' WHERE id=$1",[payment.id]);return;}
  await client.query('SELECT s.id FROM shop s WHERE s.id IN (SELECT shop_id FROM shop_order WHERE checkout_id=$1) ORDER BY s.id FOR UPDATE',[checkout.id]);
  await client.query('SELECT p.id FROM product p WHERE p.id IN (SELECT i.product_id FROM order_item i JOIN shop_order o ON o.id=i.order_id WHERE o.checkout_id=$1) ORDER BY p.id FOR UPDATE',[checkout.id]);
  await client.query('SELECT v.id FROM product_variant v WHERE v.id IN (SELECT variant_id FROM inventory_reservation WHERE checkout_id=$1) ORDER BY v.id FOR UPDATE',[checkout.id]);
  const rows=(await client.query<{variant_id:string;quantity:number;status:string;stock:number;reserved:number;active:boolean;productStatus:string;shopStatus:string}>('SELECT r.variant_id,r.quantity,r.status,v.stock,v.reserved,v.active,p.status AS "productStatus",s.status AS "shopStatus" FROM inventory_reservation r JOIN product_variant v ON v.id=r.variant_id JOIN product p ON p.id=v.product_id JOIN shop s ON s.id=p.shop_id WHERE r.checkout_id=$1 ORDER BY r.variant_id',[checkout.id])).rows;
  const canFulfill=rows.length>0&&checkout.status!=='refund_required'&&checkout.cancel_reason!=='buyer'&&rows.every(r=>r.active&&r.productStatus==='published'&&r.shopStatus==='approved'&&(r.status==='held'?r.reserved>=r.quantity&&r.stock>=r.quantity:r.status==='released'&&r.stock-r.reserved>=r.quantity));
  if(canFulfill){for(const r of rows)await client.query('UPDATE product_variant SET stock=stock-$2,reserved=reserved-$3 WHERE id=$1',[r.variant_id,r.quantity,r.status==='held'?r.quantity:0]);await client.query("UPDATE inventory_reservation SET status='consumed' WHERE checkout_id=$1",[checkout.id]);await client.query("UPDATE checkout SET status='paid' WHERE id=$1",[checkout.id]);await client.query("UPDATE shop_order SET status='paid' WHERE checkout_id=$1",[checkout.id]);}
  else{for(const r of rows)if(r.status==='held')await client.query('UPDATE product_variant SET reserved=reserved-$2 WHERE id=$1',[r.variant_id,r.quantity]);await client.query("UPDATE inventory_reservation SET status='released' WHERE checkout_id=$1 AND status='held'",[checkout.id]);await client.query("UPDATE checkout SET status='refund_required' WHERE id=$1",[checkout.id]);await client.query("UPDATE shop_order SET status='refund_required' WHERE checkout_id=$1",[checkout.id]);await client.query("INSERT INTO payment_exception(checkout_id,reason) VALUES($1,'CannotFulfillPaidOrder') ON CONFLICT DO NOTHING",[checkout.id]);}
  await client.query("UPDATE payment_intent SET status='paid',paid_at=now() WHERE id=$1",[payment.id]);
 });
}
