import { z } from 'zod';
import { db } from '@/server/db';
import { DomainError,type Page,type Actor } from '@/modules/shared/types';
import { assertActiveActor,requirePermission } from '@/modules/access/service';
import { normalizeSearch } from './schema';
export type ProductCard={id:string;name:string;shopId:string;shopName:string;price:string;stock:number;status:string};
export type CatalogQuery={query?:string;categoryId?:string;shopId?:string;minPrice?:string;maxPrice?:string;cursor?:string;limit?:number};
const querySchema=z.object({query:z.string().max(300).optional(),categoryId:z.uuid().optional(),shopId:z.uuid().optional(),minPrice:z.string().regex(/^\d{1,13}$/).optional(),maxPrice:z.string().regex(/^\d{1,13}$/).optional(),cursor:z.uuid().optional(),limit:z.number().int().min(1).max(50).default(24)});
const columns='p.id,p.name,p.shop_id AS "shopId",s.name AS "shopName",p.status,min(v.price)::text AS price,coalesce(sum(v.stock-v.reserved),0)::int AS stock';
export async function searchCatalog(input:CatalogQuery):Promise<Page<ProductCard>>{
 const parsed=querySchema.safeParse(input);if(!parsed.success)throw new DomainError('INVALID_INPUT','Bộ lọc hoặc trang tìm kiếm không hợp lệ.');const q=parsed.data;
 const values:unknown[]=[];const bind=(value:unknown)=>{values.push(value);return `$${values.length}`;};
 const where=["p.status='published'","s.status='approved'",'v.active=true'];
 if(q.query?.trim())where.push(`to_tsvector('simple',p.search_text) @@ plainto_tsquery('simple',${bind(normalizeSearch(q.query))})`);
 if(q.categoryId)where.push(`p.category_id=${bind(q.categoryId)}`);if(q.shopId)where.push(`p.shop_id=${bind(q.shopId)}`);
 if(q.minPrice)where.push(`v.price>=${bind(q.minPrice)}::bigint`);if(q.maxPrice)where.push(`v.price<=${bind(q.maxPrice)}::bigint`);
 if(q.cursor)where.push(`p.id>${bind(q.cursor)}`);
 const items=(await db.query<ProductCard>(`SELECT ${columns} FROM product p JOIN shop s ON s.id=p.shop_id JOIN product_variant v ON v.product_id=p.id WHERE ${where.join(' AND ')} GROUP BY p.id,s.id ORDER BY p.id LIMIT ${bind(q.limit+1)}`,values)).rows;
 return {items:items.slice(0,q.limit),nextCursor:items.length>q.limit?items[q.limit-1].id:null};
}
export async function getPublicProduct(id:string){
 if(!z.uuid().safeParse(id).success)return null;
 const p=(await db.query<ProductCard&{description:string;categoryName:string;attributes:Record<string,string|number>}>(`SELECT ${columns},p.description,p.attributes,c.name AS "categoryName" FROM product p JOIN shop s ON s.id=p.shop_id JOIN category c ON c.id=p.category_id JOIN product_variant v ON v.product_id=p.id AND v.active=true WHERE p.id=$1 AND p.status='published' AND s.status='approved' GROUP BY p.id,s.id,c.id`,[id])).rows[0];
 if(!p)return null;
 return {...p,variants:(await db.query<{id:string;sku:string;label:string;price:string;stock:number}>('SELECT id,sku,label,price::text,(stock-reserved)::int AS stock FROM product_variant WHERE product_id=$1 AND active=true ORDER BY id',[id])).rows};
}
export async function listOwnProducts(actor:Actor){await assertActiveActor(actor);return(await db.query<{id:string;name:string;status:string;price:string}>("SELECT p.id,p.name,p.status,min(v.price)::text AS price FROM product p JOIN shop s ON s.id=p.shop_id LEFT JOIN product_variant v ON v.product_id=p.id AND v.active=true WHERE s.owner_user_id=$1 GROUP BY p.id ORDER BY p.updated_at DESC",[actor.userId])).rows;}
export async function getOwnProduct(actor:Actor,id:string){await assertActiveActor(actor);const p=(await db.query<{id:string;shopId:string;categoryId:string;name:string;description:string;attributes:Record<string,string|number>}>('SELECT p.id,p.shop_id AS "shopId",p.category_id AS "categoryId",p.name,p.description,p.attributes FROM product p JOIN shop s ON s.id=p.shop_id WHERE p.id=$1 AND s.owner_user_id=$2',[id,actor.userId])).rows[0];if(!p)return null;return{...p,variants:(await db.query<{id:string;sku:string;label:string;price:string;stock:number}>('SELECT id,sku,label,price::text,stock FROM product_variant WHERE product_id=$1 AND active=true ORDER BY id',[id])).rows};}
export async function listProductsForReview(actor:Actor){await requirePermission(actor,'content.moderate');return(await db.query<{id:string;name:string;description:string;shopName:string;status:string}>("SELECT p.id,p.name,p.description,p.status,s.name AS \"shopName\" FROM product p JOIN shop s ON s.id=p.shop_id WHERE s.status='approved' ORDER BY p.updated_at DESC LIMIT 100")).rows;}
