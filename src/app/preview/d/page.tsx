import { FeedD } from "./feed";
import { SearchD } from "./search";

export const metadata = { title: "Bản D · Kết hợp B và C" };

export default async function PreviewD({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  return view === "search" ? <SearchD /> : <FeedD />;
}
