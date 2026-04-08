import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getValidToken, testConnection } from '@/lib/reddit';

export async function GET() {
  const db = getDb();
  const subreddits = db.prepare('SELECT * FROM subreddits ORDER BY name').all();
  const lastScan = db.prepare('SELECT * FROM scan_runs ORDER BY ran_at DESC LIMIT 1').get() ?? null;
  const tokenRow = db.prepare('SELECT refresh_token FROM auth_tokens WHERE id = 1').get() as { refresh_token: string } | undefined;
  const hasRefreshToken = !!(tokenRow?.refresh_token);
  let connectionStatus: { ok: boolean; username?: string } = { ok: false };
  try { connectionStatus = await testConnection(await getValidToken()); } catch {}
  return NextResponse.json({ subreddits, lastScan, connectionStatus, hasRefreshToken });
}

export async function POST(req: NextRequest) {
  const { action, name, id, active } = await req.json();
  const db = getDb();
  if (action === 'add') db.prepare('INSERT OR IGNORE INTO subreddits (name) VALUES (?)').run((name as string).replace(/^r\//, ''));
  else if (action === 'toggle') db.prepare('UPDATE subreddits SET active = ? WHERE id = ?').run(active ? 1 : 0, id);
  else if (action === 'remove') db.prepare('DELETE FROM subreddits WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
