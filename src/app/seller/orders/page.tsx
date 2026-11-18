import { pageActor } from '@/server/page-access';
import { listSellerOrders } from '@/modules/orders/service';
import { OrderList } from '@/components/order-list';
export default async function Orders(){const actor=await pageActor();return <><h1>Đơn của gian hàng</h1><p className="muted">Xác nhận đơn đã thanh toán, cập nhật đơn vị vận chuyển và mã theo dõi.</p><OrderList items={await listSellerOrders(actor)}/></>;}
