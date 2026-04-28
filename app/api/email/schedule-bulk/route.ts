import { NextRequest, NextResponse } from 'next/server';
import { getDb, ensureReady } from '@/lib/db';

interface BulkScheduleItem { stepId: number; subject: string; bodyHtml: string; }

export async function POST(req: NextRequest) {
  try {
    await ensureReady();
    const { items, sendAt }: { items: BulkScheduleItem[]; sendAt: string } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items must be a non-empty array' }, { status: 400 });
    }
    if (!sendAt || new Date(sendAt) <= new Date()) {
      return NextResponse.json({ error: 'sendAt must be a future datetime' }, { status: 400 });
    }

    const db = getDb();
    let scheduled = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        await db.execute({
          sql: 'UPDATE sequence_steps SET status = ?, scheduled_at = ?, subject = ?, body_html = ? WHERE id = ?',
          args: ['scheduled', sendAt, item.subject, item.bodyHtml, item.stepId],
        });
        scheduled++;
      } catch (e: any) {
        errors.push(`Step ${item.stepId}: ${e.message}`);
      }
    }

    return NextResponse.json({ success: true, scheduled, ...(errors.length ? { errors } : {}) });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
