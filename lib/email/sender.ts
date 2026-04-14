import { Resend } from 'resend';

export interface SendResult { id: string; }

export async function sendEmail(params: {
  to: string; subject: string; html: string;
}): Promise<SendResult> {
  if (process.env.DRY_RUN === 'true') {
    console.log(`[DRY RUN] Would send to ${params.to}: ${params.subject}`);
    return { id: `dry-run-${Date.now()}` };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from: `${process.env.FROM_NAME ?? 'AnswerInsight'} <${process.env.FROM_EMAIL ?? 'outreach@answerinsight.co'}>`,
    replyTo: process.env.REPLY_TO ?? undefined,
    to: [params.to],
    subject: params.subject,
    html: params.html,
    open_tracking: true,
    click_tracking: false,
  } as any);

  if (error) throw new Error(`Resend error: ${error.message}`);
  return { id: data!.id };
}
