import { searchCatalog } from "@/modules/catalog/queries";
import { apiError } from "@/server/http";
export async function GET(request: Request) {
  try {
    return Response.json(
      await searchCatalog({
        query: new URL(request.url).searchParams.get("q") ?? "",
        limit: 30,
      }),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
