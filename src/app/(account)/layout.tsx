import { pageActor } from "@/server/page-access";
import { PrivateSession } from "@/components/private-session";
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await pageActor();
  return (
    <PrivateSession key={actor.userId} userId={actor.userId}>
      {children}
    </PrivateSession>
  );
}
