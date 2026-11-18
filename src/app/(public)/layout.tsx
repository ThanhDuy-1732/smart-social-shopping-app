import { optionalActor } from "@/server/optional-actor";
import { PrivateSession } from "@/components/private-session";
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await optionalActor();
  return actor ? (
    <PrivateSession key={actor.userId} userId={actor.userId} publicPage>
      {children}
    </PrivateSession>
  ) : (
    children
  );
}
