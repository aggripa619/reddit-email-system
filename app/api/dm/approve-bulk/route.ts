import { NextRequest, NextResponse } from 'next/server';
import { getDb, ensureReady } from '@/lib/db';
import { getValidToken, sendRedditDM } from '@/lib/reddit';

interface BulkApproveItem { pendingDmId: number; finalSubject: string; finalBody: string; }

export async function POST(req: NextRequest) {
  try {
    await ensureReady();
    const { items }: { items: BulkApproveItem[] } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items must be a non-empty array' }, { status: 400 });
    }

    const db = getDb();
    const token = await getValidToken();
    let sent = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        const pendingResult = await db.execute({ sql: 'SELECT * FROM pending_dms WHERE id = ?', args: [item.pendingDmId] });
        const pending = pendingResult.rows[0] as any;
        if (!pending) { errors.push(`DM ${item.pendingDmId}: not found`); continue; }

        await sendRedditDM(token, String(pending.reddit_username), item.finalSubject, item.finalBody);

        await db.execute({
          sql: 'INSERT INTO sent_dms (pending_dm_id, reddit_username, final_subject, final_body) VALUES (?, ?, ?, ?)',
          args: [item.pendingDmId, pending.reddit_username, item.finalSubject, item.finalBody],
        });

        const existingResult = await db.execute({
          sql: 'SELECT id, total_contacts FROM contact_log WHERE reddit_username = ?',
          args: [pending.reddit_username],
        });
        const existing = existingResult.rows[0] as any;

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

        await db.execute({ sql: "UPDATE pending_dms SET status = 'approved' WHERE id = ?", args: [item.pendingDmId] });
        sent++;
      } catch (e: any) {
        errors.push(`DM ${item.pendingDmId}: ${e.message}`);
      }
    }

    return NextResponse.json({ success: true, sent, ...(errors.length ? { errors } : {}) });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
