import { getDb } from '../db';
import { insertSequenceStep, updateProspectStatus, discardRemainingSteps } from './db';

const STEP_DELAYS_DAYS: Record<number, number> = { 1: 0, 2: 4, 3: 8 };

function substitute(template: string, prospect: Record<string, string>): string {
  return template
    .replace(/\{\{first_name\}\}/g, prospect.first_name ?? '')
    .replace(/\{\{last_name\}\}/g, prospect.last_name ?? '')
    .replace(/\{\{company\}\}/g, prospect.company ?? '')
    .replace(/\{\{job_title\}\}/g, prospect.job_title ?? '');
}

export async function scheduleNextStep(prospectId: number, justCompletedStep: number): Promise<void> {
  const db = getDb();
  const nextStep = justCompletedStep + 1;
  if (nextStep > 3) return;

  const prospectResult = await db.execute({ sql: 'SELECT * FROM prospects WHERE id = ?', args: [prospectId] });
  const prospect = prospectResult.rows[0] as any;
  if (!prospect) return;
  if (['bounced', 'unsubscribed', 'replied'].includes(prospect.status)) return;

  const tmplResult = await db.execute({
    sql: 'SELECT * FROM email_templates WHERE step = ? ORDER BY id DESC LIMIT 1',
    args: [nextStep],
  });
  const tmpl = tmplResult.rows[0] as unknown as { subject: string; body_html: string } | undefined;

  if (!tmpl) {
    console.warn(`[Sequence] No template found for step ${nextStep} — skipping.`);
    return;
  }

  const subject  = substitute(String(tmpl.subject),   prospect);
  const bodyHtml = substitute(String(tmpl.body_html), prospect);

  const scheduledAt = new Date();
  scheduledAt.setDate(scheduledAt.getDate() + STEP_DELAYS_DAYS[nextStep]);

  await insertSequenceStep({
    prospect_id: prospectId, step: nextStep,
    scheduled_at: scheduledAt.toISOString(),
    status: 'pending', subject, body_html: bodyHtml,
  });

  if (justCompletedStep === 1) {
    await updateProspectStatus(prospectId, 'active');
  }
}

export async function handleStopCondition(
  prospectId: number, reason: 'replied' | 'bounced' | 'unsubscribed'
): Promise<void> {
  await updateProspectStatus(prospectId, reason);
  await discardRemainingSteps(prospectId);
}
