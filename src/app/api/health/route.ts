import { db } from '@/server/db';
import { healthResponse } from '@/server/health';
export const dynamic = 'force-dynamic';
export async function GET() { return healthResponse(db); }
