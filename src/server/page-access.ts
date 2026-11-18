import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireActor, requirePermission } from '@/modules/access/service';
import { DomainError, type Actor } from '@/modules/shared/types';
export async function pageActor(permission?: string) {
  let actor: Actor;
  try { actor = await requireActor(await headers()); }
  catch (error) {
    if (!(error instanceof DomainError)) throw error;
    redirect(error.code === 'UNAUTHENTICATED' ? '/login' : '/login?access=denied');
  }
  if (permission) {
    try { await requirePermission(actor, permission); }
    catch (error) {
      if (!(error instanceof DomainError)) throw error;
      redirect('/settings?access=denied');
    }
  }
  return actor;
}
