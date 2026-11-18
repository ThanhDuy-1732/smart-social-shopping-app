import { redirect } from 'next/navigation';
import { pageActor } from '@/server/page-access';
import { getOwnShop } from '@/modules/shops/service';
import { listCategories } from '@/modules/catalog/service';
import { ProductEditor } from '@/components/product-editor';
export default async function NewProduct(){const actor=await pageActor();const shop=await getOwnShop(actor);if(shop?.status!=='approved')redirect('/seller');return <><h1>Thêm sản phẩm</h1><div className="panel" style={{maxWidth:850}}><ProductEditor shopId={shop.id} categories={await listCategories()}/></div></>;}
