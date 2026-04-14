import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getProspectById, deleteProspect, insertSentStep, updateProspectStatus } from '@/lib/email/db';
import { sendEmail } from '@/lib/email/sender';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const prospectId = parseInt(id);
  const prospect = await getProspectById(prospectId);
  if (!prospect) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const result = await getDb().execute({
    sql: 'SELECT * FROM sequence_steps WHERE prospect_id = ? ORDER BY step ASC, id ASC',
    args: [prospectId],
  });

  return NextResponse.json({ prospect, emailHistory: result.rows });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const prospectId = parseInt(id);
  if (!await getProspectById(prospectId)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await deleteProspect(prospectId);
  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const prospectId = parseInt(id);
  const prospect = await getProspectById(prospectId);
  if (!prospect) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const { subject, bodyHtml } = await req.json();
    if (!subject || !bodyHtml) {
      return NextResponse.json({ error: 'subject and bodyHtml are required' }, { status: 400 });
    }

    const maxStepResult = await getDb().execute({
      sql: 'SELECT MAX(step) as m FROM sequence_steps WHERE prospect_id = ?',
      args: [prospectId],
    });
    const m = maxStepResult.rows[0]?.m;
    const step = Math.min((m != null ? Number(m) : 0) + 1, 3);

    const { id: resendId } = await sendEmail({ to: prospect.email, subject, html: bodyHtml });
    await insertSentStep(prospectId, step, subject, bodyHtml, resendId);

    if (prospect.status === 'pending') {
      await updateProspectStatus(prospectId, 'active');
    }

    return NextResponse.json({ success: true, resendId });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
