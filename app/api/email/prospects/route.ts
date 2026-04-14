import { NextRequest, NextResponse } from 'next/server';
import { getAllProspects, insertProspect, getProspectByEmail, updateProspectBlurb } from '@/lib/email/db';
import { scoreRisk } from '@/lib/email/risk';
import { inferPersona } from '@/lib/email/ingest';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') ?? '1');
  const status = searchParams.get('status') ?? undefined;
  return NextResponse.json(await getAllProspects(page, 50, status));
}

export async function POST(req: NextRequest) {
  const { email, first_name, last_name, company, job_title } = await req.json();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
  }
  if (await getProspectByEmail(email)) {
    return NextResponse.json({ error: 'This email already exists in your prospects.' }, { status: 409 });
  }

  const persona = inferPersona(job_title ?? '');
  const prospectId = await insertProspect({
    email, first_name, last_name, company, job_title,
    persona, source: 'manual', company_blurb: '', status: 'pending', risk_score: 0,
  });

  const { score } = scoreRisk(email, job_title ?? '', '');
  await updateProspectBlurb(prospectId, '', score);

  return NextResponse.json({ success: true, id: prospectId });
}
