import { beforeAll,afterAll,expect,test } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db } from '@/server/db';
import { prepareDatabase } from '../fixtures/database';
import { commerceFixture,cleanupCommerce,type CommerceFixture } from '../fixtures/commerce';
import { setShippingRate } from '@/modules/shipping/service';
import { setCartItem,quoteCart,createCheckout,releaseExpiredReservations } from '@/modules/checkout/service';
import { applyVerifiedPaymentEvent,startPayment,handlePaymentWebhook } from '@/modules/payments/service';
let f:CommerceFixture;
const address={name:'Người nhận thử',phone:'0901234567',region:'Hà Nội',line:'12 đường A, phường B, Hà Nội'};
async function pending(){const p=f.products[0];await setCartItem(f.buyer,p.variantId,1);const q=await quoteCart(f.buyer,{region:'Hà Nội'});const checkout=await createCheckout(f.buyer,{address,quoteToken:q.token},randomUUID());const paymentId=randomUUID();await db.query("INSERT INTO payment_intent(id,checkout_id,provider_reference,amount,currency) VALUES($1,$2,$3,$4,'VND')",[paymentId,checkout.id,paymentId,checkout.total]);return {checkout,paymentId};}
beforeAll(async()=>{await prepareDatabase();f=await commerceFixture();for(const p of f.products)await setShippingRate(p.owner,p.shopId,{region:'*',fee:'30000',estimatedDays:3});});
afterAll(async()=>{if(f)await cleanupCommerce(f);await db.end();});
test('payment events are applied once and later failure cannot undo a paid payment',async()=>{
 const {checkout,paymentId}=await pending();const event={eventId:randomUUID(),providerReference:paymentId,amount:checkout.total,currency:'VND',status:'paid'};
 const before=(await db.query('SELECT stock,reserved FROM product_variant WHERE id=$1',[f.products[0].variantId])).rows[0];
 await applyVerifiedPaymentEvent(event);await applyVerifiedPaymentEvent(event);await applyVerifiedPaymentEvent({...event,eventId:randomUUID(),status:'failed'});
 const after=(await db.query('SELECT stock,reserved FROM product_variant WHERE id=$1',[f.products[0].variantId])).rows[0];expect(after.stock).toBe(before.stock-1);expect(after.reserved).toBe(before.reserved-1);
 expect((await db.query('SELECT status FROM checkout WHERE id=$1',[checkout.id])).rows[0].status).toBe('paid');
});
test('wrong amount and currency are rejected without consuming stock',async()=>{
 const {checkout,paymentId}=await pending();const event={eventId:randomUUID(),providerReference:paymentId,amount:'1',currency:'VND',status:'paid'};
 await expect(applyVerifiedPaymentEvent(event)).rejects.toMatchObject({code:'INVALID_INPUT'});
 await expect(applyVerifiedPaymentEvent({...event,amount:checkout.total,currency:'USD'})).rejects.toMatchObject({code:'INVALID_INPUT'});
 expect((await db.query('SELECT status FROM checkout WHERE id=$1',[checkout.id])).rows[0].status).toBe('awaiting_payment');
});
test('late paid event reallocates stock only when stock is still available',async()=>{
 const {checkout,paymentId}=await pending();await db.query("UPDATE checkout SET expires_at=now()-interval '1 minute' WHERE id=$1",[checkout.id]);await releaseExpiredReservations();
 await applyVerifiedPaymentEvent({eventId:randomUUID(),providerReference:paymentId,amount:checkout.total,currency:'VND',status:'paid'});
 expect((await db.query('SELECT status FROM checkout WHERE id=$1',[checkout.id])).rows[0].status).toBe('paid');
});
test('late money without available stock is tracked for refund instead of overselling',async()=>{
 const {checkout,paymentId}=await pending();await db.query("UPDATE checkout SET expires_at=now()-interval '1 minute' WHERE id=$1",[checkout.id]);await releaseExpiredReservations();
 const variant=f.products[0].variantId;const available=(await db.query('SELECT stock-reserved AS available FROM product_variant WHERE id=$1',[variant])).rows[0].available;await setCartItem(f.other,variant,available);const quote=await quoteCart(f.other,{region:'Hà Nội'});await createCheckout(f.other,{address,quoteToken:quote.token},randomUUID());
 await applyVerifiedPaymentEvent({eventId:randomUUID(),providerReference:paymentId,amount:checkout.total,currency:'VND',status:'paid'});
 expect((await db.query('SELECT status FROM checkout WHERE id=$1',[checkout.id])).rows[0].status).toBe('refund_required');
 expect((await db.query('SELECT stock-reserved AS available FROM product_variant WHERE id=$1',[variant])).rows[0].available).toBe(0);
});
test('unconfigured provider rejects start and every unsigned callback',async()=>{
 await expect(startPayment(f.buyer,randomUUID())).rejects.toMatchObject({code:'NOT_FOUND'});
 await expect(handlePaymentWebhook(new Uint8Array(),new Headers())).rejects.toMatchObject({code:'PROVIDER_UNAVAILABLE'});
});

test('one checkout cannot acquire a second independent payment intent',async()=>{
 const checkout=(await db.query('SELECT id,total::text FROM checkout WHERE buyer_id=$1 ORDER BY id LIMIT 1',[f.buyer.userId])).rows[0];
 await expect(db.query("INSERT INTO payment_intent(id,checkout_id,provider_reference,amount,currency) VALUES($1,$2,$3,$4,'VND')",[randomUUID(),checkout.id,randomUUID(),checkout.total])).rejects.toMatchObject({code:'23505'});
});
