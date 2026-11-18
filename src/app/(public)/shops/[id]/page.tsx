import { notFound } from 'next/navigation';
import { db } from '@/server/db';
import { searchCatalog } from '@/modules/catalog/queries';
import { ProductGrid } from '@/components/product-grid';
export const dynamic='force-dynamic';
export default async function Shop({params}:{params:Promise<{id:string}>}){const{id}=await params;const shop=(await db.query("SELECT id,name,description FROM shop WHERE id=$1 AND status='approved'",[id])).rows[0];if(!shop)notFound();const result=await searchCatalog({shopId:id});return <><div className="page-heading"><div><h1>{shop.name}</h1><p className="muted">{shop.description}</p></div></div>{result.items.length?<ProductGrid items={result.items}/>:<div className="panel empty"><h2>Gian hàng đang chuẩn bị sản phẩm</h2><p>Quay lại sau để khám phá các món mới.</p></div>}</>;}
