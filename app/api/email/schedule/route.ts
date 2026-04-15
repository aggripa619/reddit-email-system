import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { stepId, subject, bodyHtml, sendAt } = await req.json();

    if (!stepId || !sendAt) {
      return NextResponse.json({ error: 'stepId and sendAt are required' }, { status: 400 });
    }

    if (new Date(sendAt) <= new Date()) {
      return NextResponse.json({ error: 'sendAt must be in the future' }, { status: 400 });
    }

    const db = getDb();
    const result = await db.execute({ sql: 'SELECT * FROM sequence_steps WHERE id = ?', args: [stepId] });
    const step = result.rows[0] as any;
    if (!step) return NextResponse.json({ error: 'Step not found' }, { status: 404 });

    await db.execute({
      sql: 'UPDATE sequence_steps SET status = ?, scheduled_at = ?, subject = ?, body_html = ? WHERE id = ?',
      args: ['scheduled', new Date(sendAt).toISOString(), subject ?? step.subject, bodyHtml ?? step.body_html, stepId],
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
