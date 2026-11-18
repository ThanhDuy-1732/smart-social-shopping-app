import { pageActor } from "@/server/page-access";
import { getShopReport } from "@/modules/reporting/service";
import { getOwnShop } from "@/modules/shops/service";
import { ReportView } from "@/components/report-view";
import { DomainError } from "@/modules/shared/types";
export default async function Reports({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const actor = await pageActor(),
    shop = await getOwnShop(actor);
  if (!shop) return <p>Đăng ký gian hàng để xem báo cáo.</p>;
  const q = await searchParams,
    today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10),
    range = { from: q.from ?? today.slice(0, 8) + "01", to: q.to ?? today };
  try {
    return (
      <>
        <h1>Báo cáo {shop.name}</h1>
        <ReportView
          range={range}
          shopId={shop.id}
          report={await getShopReport(actor, shop.id, range)}
        />
      </>
    );
  } catch (e) {
    if (e instanceof DomainError)
      return (
        <>
          <h1>Báo cáo gian hàng</h1>
          <p role="alert">{e.message}</p>
          <a href="/seller/reports">Chọn lại khoảng ngày</a>
        </>
      );
    throw e;
  }
}
