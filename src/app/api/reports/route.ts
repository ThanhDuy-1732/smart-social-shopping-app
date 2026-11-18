import { requireActor } from "@/modules/access/service";
import {
  getPlatformReport,
  getShopReport,
  csvCell,
} from "@/modules/reporting/service";
import { apiError } from "@/server/http";
export async function GET(request: Request) {
  try {
    const actor = await requireActor(request.headers),
      q = new URL(request.url).searchParams,
      range = { from: q.get("from") ?? "", to: q.get("to") ?? "" },
      shop = q.get("shopId"),
      report = shop
        ? await getShopReport(actor, shop, range)
        : await getPlatformReport(actor, range);
    const rows = [
      ["Chỉ tiêu", "Giá trị (VND / số đơn / %)"],
      ...Object.entries(report)
        .filter(([k]) => !["sources", "daily", "activity"].includes(k))
        .map(([k, v]) => [k, String(v)]),
      [],
      ["Ngày Việt Nam", "Tiền ròng", "Phí ghi nhận"],
      ...report.daily.map((d) => [d.day, d.cash, d.fees]),
    ];
    return new Response(
      "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n"),
      {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="bao-cao.csv"',
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (e) {
    return apiError(e);
  }
}
