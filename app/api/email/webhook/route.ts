import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { handleStopCondition } from '@/lib/email/sequence';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const db = getDb();
    const { type, data } = payload;

    if (type === 'email.opened') {
      const r = await db.execute({ sql: 'SELECT * FROM sequence_steps WHERE resend_id = ?', args: [data?.email_id] });
      const step = r.rows[0] as any;
      if (step && !step.opened_at) {
        await db.execute({ sql: 'UPDATE sequence_steps SET opened_at = ? WHERE id = ?', args: [new Date().toISOString(), step.id] });
      }
    }

    if (type === 'email.bounced') {
      const r = await db.execute({ sql: 'SELECT * FROM sequence_steps WHERE resend_id = ?', args: [data?.email_id] });
      const step = r.rows[0] as any;
      if (step) {
        await db.execute({ sql: 'UPDATE sequence_steps SET bounced_at = ? WHERE id = ?', args: [new Date().toISOString(), step.id] });
        await handleStopCondition(step.prospect_id, 'bounced');
      }
    }

    if (type === 'email.complained') {
      const r = await db.execute({ sql: 'SELECT * FROM sequence_steps WHERE resend_id = ?', args: [data?.email_id] });
      const step = r.rows[0] as any;
      if (step) await handleStopCondition(step.prospect_id, 'unsubscribed');
    }

    if (type === 'email.delivered') {
      const r = await db.execute({ sql: 'SELECT * FROM sequence_steps WHERE resend_id = ?', args: [data?.email_id] });
      const step = r.rows[0] as any;
      if (step && !step.delivered_at) {
        await db.execute({ sql: 'UPDATE sequence_steps SET delivered_at = ? WHERE id = ?', args: [new Date().toISOString(), step.id] });
      }
    }

    if (type === 'email.clicked') {
      const r = await db.execute({ sql: 'SELECT * FROM sequence_steps WHERE resend_id = ?', args: [data?.email_id] });
      const step = r.rows[0] as any;
      if (step && !step.clicked_at) {
        await db.execute({ sql: 'UPDATE sequence_steps SET clicked_at = ? WHERE id = ?', args: [new Date().toISOString(), step.id] });
      }
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
