import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { db, withTransaction } from '@/server/db';
import { requirePermission } from '@/modules/access/service';
import { DomainError, type Actor } from '@/modules/shared/types';
const terms = z.string().trim().min(10).max(10000);
export const policySchema = z.object({
  commissionBps: z.number().int().min(0).max(10000), returnDays: z.number().int().min(0).max(365),
  sellerAcceptHours: z.number().int().min(1).max(168), settlementHoldDays: z.number().int().min(0).max(365),
  cancellationTerms:terms, returnTerms:terms, receiptTerms:terms, shippingTerms:terms,
});
export type TradingPolicy = z.infer<typeof policySchema> & { id:string; version:string; active:boolean };
export async function publishPolicy(actor: Actor, input: unknown): Promise<string> {
  await requirePermission(actor,'policies.manage');
  const parsed = policySchema.safeParse(input);
  if (!parsed.success) throw new DomainError('INVALID_INPUT','Điền đầy đủ mức phí, thời hạn và các điều kiện giao dịch hợp lệ.');
  const v=parsed.data;
  return withTransaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(1937194)');
    await client.query('UPDATE trading_policy SET active=false WHERE active=true');
    const id=randomUUID();
    await client.query('INSERT INTO trading_policy(id,commission_bps,return_days,seller_accept_hours,settlement_hold_days,cancellation_terms,return_terms,receipt_terms,shipping_terms,active,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10)',[id,v.commissionBps,v.returnDays,v.sellerAcceptHours,v.settlementHoldDays,v.cancellationTerms,v.returnTerms,v.receiptTerms,v.shippingTerms,actor.userId]);
    await client.query("INSERT INTO audit_event(id,actor_id,action,target_id) VALUES($1,$2,'policy.publish',$3)",[randomUUID(),actor.userId,id]);
    return id;
  });
}
export async function getActivePolicy(): Promise<TradingPolicy> {
  const value = (await db.query<TradingPolicy>('SELECT id,version::text,active,commission_bps AS "commissionBps",return_days AS "returnDays",seller_accept_hours AS "sellerAcceptHours",settlement_hold_days AS "settlementHoldDays",cancellation_terms AS "cancellationTerms",return_terms AS "returnTerms",receipt_terms AS "receiptTerms",shipping_terms AS "shippingTerms" FROM trading_policy WHERE active=true')).rows[0];
  if (!value) throw new DomainError('CONFLICT','Chính sách giao dịch chưa được công bố.');
  return value;
}
