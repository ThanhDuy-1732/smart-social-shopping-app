import { FeedA } from "./feed";
import { SearchA } from "./search";

export const metadata = { title: "Bản A · Tạp chí" };

export default async function PreviewA({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  return view === "search" ? <SearchA /> : <FeedA />;
}
