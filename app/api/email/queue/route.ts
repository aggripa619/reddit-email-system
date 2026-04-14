import { NextResponse } from 'next/server';
import { getPendingSteps } from '@/lib/email/db';

export async function GET() {
  try {
    return NextResponse.json({ steps: await getPendingSteps() });
  } catch (e: unknown) {
    const msg = String(e);
    console.error('[email/queue] error:', msg);
    return NextResponse.json({ error: msg, steps: [] }, { status: 500 });
  }
}
