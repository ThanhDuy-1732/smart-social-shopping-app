import { pageActor } from "@/server/page-access";
import { listBuyerOrders } from "@/modules/orders/service";
import { OrderList } from "@/components/order-list";
export default async function Orders() {
  const actor = await pageActor();
  return (
    <>
      <h1>Đơn mua của bạn</h1>
      <OrderList items={await listBuyerOrders(actor)} />
    </>
  );
}
