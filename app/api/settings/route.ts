import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getValidToken, testConnection } from '@/lib/reddit';

export async function GET() {
  const db = getDb();
  const [subredditsResult, lastScanResult, tokenResult] = await db.batch([
    'SELECT * FROM subreddits ORDER BY name',
    'SELECT * FROM scan_runs ORDER BY ran_at DESC LIMIT 1',
    'SELECT refresh_token FROM auth_tokens WHERE id = 1',
  ], 'read');

  const subreddits     = subredditsResult.rows;
  const lastScan       = lastScanResult.rows[0] ?? null;
  const tokenRow       = tokenResult.rows[0] as unknown as { refresh_token: string } | undefined;
  const hasRefreshToken = !!(tokenRow?.refresh_token);

  let connectionStatus: { ok: boolean; username?: string } = { ok: false };
  try { connectionStatus = await testConnection(await getValidToken()); } catch {}

  return NextResponse.json({ subreddits, lastScan, connectionStatus, hasRefreshToken });
}

export async function POST(req: NextRequest) {
  const { action, name, id, active } = await req.json();
  const db = getDb();
  if (action === 'add') {
    await db.execute({ sql: 'INSERT OR IGNORE INTO subreddits (name) VALUES (?)', args: [(name as string).replace(/^r\//, '')] });
  } else if (action === 'toggle') {
    await db.execute({ sql: 'UPDATE subreddits SET active = ? WHERE id = ?', args: [active ? 1 : 0, id] });
  } else if (action === 'remove') {
    await db.execute({ sql: 'DELETE FROM subreddits WHERE id = ?', args: [id] });
  }
  return NextResponse.json({ success: true });
}
