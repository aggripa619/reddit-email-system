import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const subreddit = searchParams.get('subreddit');
  const from      = searchParams.get('from');
  const to        = searchParams.get('to');
  const username  = searchParams.get('username');

  let sql = `
    SELECT s.*, p.post_title, p.post_subreddit, t.name as template_name
    FROM sent_dms s
    LEFT JOIN pending_dms p ON s.pending_dm_id = p.id
    LEFT JOIN templates t ON p.template_id = t.id
    WHERE 1=1
  `;
  const args: (string | number)[] = [];
  if (subreddit) { sql += ' AND p.post_subreddit = ?'; args.push(subreddit); }
  if (from)      { sql += ' AND s.sent_at >= ?';       args.push(from); }
  if (to)        { sql += ' AND s.sent_at <= ?';       args.push(to + ' 23:59:59'); }
  sql += ' ORDER BY s.sent_at DESC LIMIT 500';

  const rowsResult = await db.execute({ sql, args });
  const rows = rowsResult.rows;

  if (username) {
    const [contactResult, userDmsResult] = await db.batch([
      { sql: 'SELECT * FROM contact_log WHERE reddit_username = ?', args: [username] },
      { sql: 'SELECT * FROM sent_dms WHERE reddit_username = ? ORDER BY sent_at DESC', args: [username] },
    ], 'read');
    return NextResponse.json({ rows, contactHistory: contactResult.rows[0] ?? null, userDMs: userDmsResult.rows });
  }
  return NextResponse.json({ rows });
}
