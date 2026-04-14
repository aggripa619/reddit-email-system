import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { updateStepStatus } from '@/lib/email/db';
import { sendEmail } from '@/lib/email/sender';
import { scheduleNextStep } from '@/lib/email/sequence';

export async function POST(req: NextRequest) {
  try {
    const { stepId, subject, bodyHtml } = await req.json();
    const db = getDb();

    const stepResult = await db.execute({ sql: 'SELECT * FROM sequence_steps WHERE id = ?', args: [stepId] });
    const step = stepResult.rows[0] as any;
    if (!step) return NextResponse.json({ error: 'Step not found' }, { status: 404 });

    const prospectResult = await db.execute({ sql: 'SELECT * FROM prospects WHERE id = ?', args: [step.prospect_id] });
    const prospect = prospectResult.rows[0] as any;
    if (!prospect) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });

    const { id: resendId } = await sendEmail({ to: prospect.email, subject, html: bodyHtml });

    await updateStepStatus(stepId, 'sent', { sent_at: new Date().toISOString(), resend_id: resendId, subject, body_html: bodyHtml });
    await scheduleNextStep(step.prospect_id, step.step);

    return NextResponse.json({ success: true, resendId });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
