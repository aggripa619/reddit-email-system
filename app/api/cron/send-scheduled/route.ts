import { NextRequest, NextResponse } from 'next/server';
import { getDb, ensureReady } from '@/lib/db';
import { updateStepStatus } from '@/lib/email/db';
import { sendEmail } from '@/lib/email/sender';
import { scheduleNextStep } from '@/lib/email/sequence';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await ensureReady();

  const db = getDb();

  const result = await db.execute(
    "SELECT ss.*, p.email FROM sequence_steps ss JOIN prospects p ON ss.prospect_id = p.id WHERE ss.status = 'scheduled' AND datetime(ss.scheduled_at) <= datetime('now')"
  );
  const dueSteps = result.rows as any[];

  let sent = 0;
  const errors: string[] = [];

  for (const step of dueSteps) {
    try {
      const { id: resendId } = await sendEmail({
        to: step.email,
        subject: step.subject,
        html: step.body_html,
      });
      await updateStepStatus(step.id, 'sent', {
        sent_at: new Date().toISOString(),
        resend_id: resendId,
      });
      await scheduleNextStep(step.prospect_id, step.step);
      sent++;
    } catch (e: any) {
      errors.push(`Step ${step.id}: ${e.message}`);
    }
  }

  return NextResponse.json({ sent, errors: errors.length ? errors : undefined });
}
