import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getValidToken, sendRedditDM } from '@/lib/reddit';

export async function POST(req: NextRequest) {
  try {
    const { pendingDmId, finalSubject, finalBody } = await req.json();
    const db = getDb();
    const pending = db.prepare('SELECT * FROM pending_dms WHERE id = ?').get(pendingDmId) as any;
    if (!pending) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const token = await getValidToken();
    await sendRedditDM(token, pending.reddit_username, finalSubject, finalBody);

    db.prepare('INSERT INTO sent_dms (pending_dm_id, reddit_username, final_subject, final_body) VALUES (?, ?, ?, ?)')
      .run(pendingDmId, pending.reddit_username, finalSubject, finalBody);

    const existing = db.prepare('SELECT id, total_contacts FROM contact_log WHERE reddit_username = ?')
      .get(pending.reddit_username) as { id: number; total_contacts: number } | undefined;
    if (existing) {
      db.prepare('UPDATE contact_log SET last_contacted = CURRENT_TIMESTAMP, total_contacts = ? WHERE id = ?')
        .run(existing.total_contacts + 1, existing.id);
    } else {
      db.prepare('INSERT INTO contact_log (reddit_username, last_contacted, total_contacts) VALUES (?, CURRENT_TIMESTAMP, 1)')
        .run(pending.reddit_username);
    }

    db.prepare("UPDATE pending_dms SET status = 'approved' WHERE id = ?").run(pendingDmId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
