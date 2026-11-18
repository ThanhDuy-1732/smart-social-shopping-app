import type { Pool } from 'pg';
export async function healthResponse(pool: Pool): Promise<Response> {
  try {
    await pool.query('SELECT 1');
    return Response.json({ status: 'ready' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ status: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
