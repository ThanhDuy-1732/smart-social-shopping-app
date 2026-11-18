import { pageActor } from "@/server/page-access";
import { getPlatformReport } from "@/modules/reporting/service";
import { ReportView } from "@/components/report-view";
import { DomainError } from "@/modules/shared/types";
export default async function Reports({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const actor = await pageActor("reports.platform"),
    q = await searchParams,
    today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10),
    range = { from: q.from ?? today.slice(0, 8) + "01", to: q.to ?? today };
  try {
    return (
      <>
        <h1>Báo cáo nền tảng</h1>
        <ReportView
          range={range}
          report={await getPlatformReport(actor, range)}
        />
      </>
    );
  } catch (e) {
    if (e instanceof DomainError)
      return (
        <>
          <h1>Báo cáo nền tảng</h1>
          <p role="alert">{e.message}</p>
          <a href="/admin/reports">Chọn lại khoảng ngày</a>
        </>
      );
    throw e;
  }
}
