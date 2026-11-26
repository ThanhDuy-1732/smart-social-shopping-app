import { FeedB } from "./feed";
import { SearchB } from "./search";

export const metadata = { title: "Bản B · Không gian" };

export default async function PreviewB({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  return view === "search" ? <SearchB /> : <FeedB />;
}
