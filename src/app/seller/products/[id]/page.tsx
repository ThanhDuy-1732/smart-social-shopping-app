import { notFound,redirect } from 'next/navigation';
import { pageActor } from '@/server/page-access';
import { getOwnShop } from '@/modules/shops/service';
import { listCategories } from '@/modules/catalog/service';
import { getOwnProduct } from '@/modules/catalog/queries';
import { ProductEditor } from '@/components/product-editor';
export default async function EditProduct({params}:{params:Promise<{id:string}>}){const actor=await pageActor();const shop=await getOwnShop(actor);if(shop?.status!=='approved')redirect('/seller');const product=await getOwnProduct(actor,(await params).id);if(!product)notFound();return <><h1>Chỉnh sửa sản phẩm</h1><div className="panel" style={{maxWidth:850}}><ProductEditor shopId={shop.id} categories={await listCategories()} product={product}/></div></>;}
