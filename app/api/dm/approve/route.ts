import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getValidToken, sendRedditDM } from '@/lib/reddit';

export async function POST(req: NextRequest) {
  try {
    const { pendingDmId, finalSubject, finalBody } = await req.json();
    const db = getDb();

    const pendingResult = await db.execute({ sql: 'SELECT * FROM pending_dms WHERE id = ?', args: [pendingDmId] });
    const pending = pendingResult.rows[0] as any;
    if (!pending) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const token = await getValidToken();
    await sendRedditDM(token, String(pending.reddit_username), finalSubject, finalBody);

    await db.execute({
      sql: 'INSERT INTO sent_dms (pending_dm_id, reddit_username, final_subject, final_body) VALUES (?, ?, ?, ?)',
      args: [pendingDmId, pending.reddit_username, finalSubject, finalBody],
    });

    const existingResult = await db.execute({
      sql: 'SELECT id, total_contacts FROM contact_log WHERE reddit_username = ?',
      args: [pending.reddit_username],
    });
    const existing = existingResult.rows[0] as unknown as { id: number; total_contacts: number } | undefined;

    if (existing) {
      await db.execute({
        sql: 'UPDATE contact_log SET last_contacted = CURRENT_TIMESTAMP, total_contacts = ? WHERE id = ?',
        args: [Number(existing.total_contacts) + 1, existing.id],
      });
    } else {
      await db.execute({
        sql: 'INSERT INTO contact_log (reddit_username, last_contacted, total_contacts) VALUES (?, CURRENT_TIMESTAMP, 1)',
        args: [pending.reddit_username],
      });
    }

    await db.execute({ sql: "UPDATE pending_dms SET status = 'approved' WHERE id = ?", args: [pendingDmId] });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
