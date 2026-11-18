'use client';
import { useState } from 'react';
import type { AttributeDefinition } from '@/modules/catalog/schema';
import { ActionForm } from './action-form';
import { submitProduct } from '@/app/seller/products/actions';
type Variant={id?:string;sku:string;label:string;price:string;stock:number};
type EditableProduct={id:string;categoryId:string;name:string;description:string;attributes:Record<string,string|number>;variants:Variant[]};
export function ProductEditor({shopId,categories,product}:{shopId:string;categories:{id:string;name:string;attributes:AttributeDefinition[]}[];product?:EditableProduct}){
 const [categoryId,setCategoryId]=useState(product?.categoryId??categories[0]?.id??'');
 const [variants,setVariants]=useState<Variant[]>(product?.variants??[{sku:'',label:'',price:'',stock:0}]);
 const category=categories.find(x=>x.id===categoryId);
 function update(index:number,key:keyof Variant,value:string){setVariants(rows=>rows.map((row,i)=>i===index?{...row,[key]:key==='stock'?Number(value):value}:row));}
 if(!categories.length)return <p className="notice">Chưa có ngành hàng được mở bán. Vui lòng liên hệ bộ phận vận hành.</p>;
 return <ActionForm action={submitProduct} submitLabel="Lưu và gửi duyệt"><input type="hidden" name="shopId" value={shopId}/>{product&&<input type="hidden" name="id" value={product.id}/>}
 <input type="hidden" name="variants" value={JSON.stringify(variants)}/>
 <label>Tên sản phẩm<input name="name" defaultValue={product?.name} minLength={2} maxLength={160} required/></label><label>Mô tả<textarea name="description" defaultValue={product?.description} minLength={10} maxLength={10000} required/></label>
 <label>Ngành hàng<select name="categoryId" value={categoryId} onChange={e=>setCategoryId(e.target.value)} required>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
 <div className="two-col" key={categoryId}>{category?.attributes.map(def=><label key={def.key}>{def.label}{def.required?' *':''}{def.kind==='select'?<select name={`attribute:${def.key}`} defaultValue={product?.categoryId===categoryId?String(product.attributes[def.key]??''):''} required={def.required}><option value="">Chọn giá trị</option>{def.options?.map(x=><option key={x}>{x}</option>)}</select>:<input type={def.kind==='number'?'number':'text'} step={def.kind==='number'?'any':undefined} name={`attribute:${def.key}`} defaultValue={product?.categoryId===categoryId?product.attributes[def.key]:''} maxLength={500} required={def.required}/>}</label>)}</div>
 <h2>Biến thể và tồn kho</h2>{variants.map((v,i)=><div className="panel" key={v.id??i}><div className="two-col"><label>Mã SKU<input value={v.sku} onChange={e=>update(i,'sku',e.target.value)} maxLength={80} required/></label><label>Tên biến thể<input placeholder="Ví dụ: Xanh, size M" value={v.label} onChange={e=>update(i,'label',e.target.value)} maxLength={160} required/></label><label>Giá (VND)<input inputMode="numeric" pattern="[1-9][0-9]*" value={v.price} onChange={e=>update(i,'price',e.target.value)} maxLength={13} required/></label><label>Tồn kho<input type="number" min={0} max={10000000} step={1} value={v.stock} onChange={e=>update(i,'stock',e.target.value)} required/></label></div>{variants.length>1&&<button type="button" className="secondary" style={{marginTop:12}} onClick={()=>setVariants(rows=>rows.filter((_,n)=>n!==i))}>Bỏ biến thể</button>}</div>)}
 {variants.length<48&&<button type="button" className="secondary" onClick={()=>setVariants(rows=>[...rows,{sku:'',label:'',price:'',stock:0}])}>Thêm biến thể</button>}
 </ActionForm>;
}
