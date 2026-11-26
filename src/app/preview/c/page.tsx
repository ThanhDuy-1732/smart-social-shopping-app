import { FeedC } from "./feed";
import { SearchC } from "./search";

export const metadata = { title: "Bản C · Nhãn và phiếu" };

export default async function PreviewC({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  return view === "search" ? <SearchC /> : <FeedC />;
}
