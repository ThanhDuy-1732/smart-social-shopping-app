import { handlePaymentWebhook } from "@/modules/payments/service";
import { apiError, readLimitedBody } from "@/server/http";
export async function POST(request: Request) {
  try {
    await handlePaymentWebhook(
      await readLimitedBody(request, 65536),
      request.headers,
    );
    return Response.json({ received: true });
  } catch (error) {
    return apiError(error);
  }
}
