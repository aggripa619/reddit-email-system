import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const subreddit = searchParams.get('subreddit');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const username = searchParams.get('username');

  let query = `
    SELECT s.*, p.post_title, p.post_subreddit, t.name as template_name
    FROM sent_dms s
    LEFT JOIN pending_dms p ON s.pending_dm_id = p.id
    LEFT JOIN templates t ON p.template_id = t.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (subreddit) { query += ' AND p.post_subreddit = ?'; params.push(subreddit); }
  if (from) { query += ' AND s.sent_at >= ?'; params.push(from); }
  if (to) { query += ' AND s.sent_at <= ?'; params.push(to + ' 23:59:59'); }
  query += ' ORDER BY s.sent_at DESC LIMIT 500';

  const rows = db.prepare(query).all(...params);

  if (username) {
    const contactHistory = db.prepare('SELECT * FROM contact_log WHERE reddit_username = ?').get(username);
    const userDMs = db.prepare('SELECT * FROM sent_dms WHERE reddit_username = ? ORDER BY sent_at DESC').all(username);
    return NextResponse.json({ rows, contactHistory, userDMs });
  }
  return NextResponse.json({ rows });
}
