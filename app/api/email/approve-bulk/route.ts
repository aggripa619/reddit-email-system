import { NextRequest, NextResponse } from 'next/server';
import { getDb, ensureReady } from '@/lib/db';
import { updateStepStatus } from '@/lib/email/db';
import { sendEmail } from '@/lib/email/sender';
import { scheduleNextStep } from '@/lib/email/sequence';

interface BulkApproveItem { stepId: number; subject: string; bodyHtml: string; }

export async function POST(req: NextRequest) {
  try {
    await ensureReady();
    const { items }: { items: BulkApproveItem[] } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items must be a non-empty array' }, { status: 400 });
    }

    const db = getDb();
    let sent = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        const stepResult = await db.execute({ sql: 'SELECT * FROM sequence_steps WHERE id = ?', args: [item.stepId] });
        const step = stepResult.rows[0] as any;
        if (!step) { errors.push(`Step ${item.stepId}: not found`); continue; }

        const prospectResult = await db.execute({ sql: 'SELECT * FROM prospects WHERE id = ?', args: [step.prospect_id] });
        const prospect = prospectResult.rows[0] as any;
        if (!prospect) { errors.push(`Step ${item.stepId}: prospect not found`); continue; }

        const { id: resendId } = await sendEmail({ to: prospect.email, subject: item.subject, html: item.bodyHtml });

        await updateStepStatus(item.stepId, 'sent', {
          sent_at: new Date().toISOString(),
          resend_id: resendId,
          subject: item.subject,
          body_html: item.bodyHtml,
        });
        await scheduleNextStep(step.prospect_id, step.step);
        sent++;
      } catch (e: any) {
        errors.push(`Step ${item.stepId}: ${e.message}`);
      }
    }

    return NextResponse.json({ success: true, sent, ...(errors.length ? { errors } : {}) });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
