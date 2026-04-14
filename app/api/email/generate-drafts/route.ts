import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { insertSequenceStep } from '@/lib/email/db';

function substitute(template: string, prospect: Record<string, string>): string {
  return template
    .replace(/\{\{first_name\}\}/g, prospect.first_name ?? '')
    .replace(/\{\{last_name\}\}/g, prospect.last_name ?? '')
    .replace(/\{\{company\}\}/g, prospect.company ?? '')
    .replace(/\{\{job_title\}\}/g, prospect.job_title ?? '');
}

export async function POST() {
  const db = getDb();

  const tmplResult = await db.execute(
    "SELECT * FROM email_templates WHERE step = 1 ORDER BY id DESC LIMIT 1"
  );
  const tmpl = tmplResult.rows[0] as unknown as { id: number; subject: string; body_html: string } | undefined;

  if (!tmpl) {
    return NextResponse.json({ error: 'No Step 1 template found. Create one first.' }, { status: 400 });
  }

  const prospectsResult = await db.execute(`
    SELECT * FROM prospects
    WHERE status NOT IN ('bounced','unsubscribed','replied')
    AND id NOT IN (
      SELECT prospect_id FROM sequence_steps WHERE step = 1
    )
  `);
  const prospects = prospectsResult.rows as unknown as any[];

  let generated = 0;
  for (const p of prospects) {
    const subject   = substitute(String(tmpl.subject),   p);
    const body_html = substitute(String(tmpl.body_html), p);
    await insertSequenceStep({
      prospect_id: Number(p.id),
      step: 1,
      scheduled_at: new Date().toISOString(),
      status: 'pending',
      subject,
      body_html,
    });
    generated++;
  }

  return NextResponse.json({ generated });
}
