import { ActionForm } from "./action-form";
import { sendReport } from "@/app/admin/moderation/actions";
export function ReportForm({
  kind,
  targetId,
}: {
  kind: string;
  targetId: string;
}) {
  return (
    <details className="report-form">
      <summary>Báo cáo nội dung</summary>
      <ActionForm action={sendReport} submitLabel="Gửi báo cáo">
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="targetId" value={targetId} />
        <label>
          Lý do báo cáo
          <textarea name="reason" minLength={10} maxLength={2000} required />
        </label>
      </ActionForm>
    </details>
  );
}
