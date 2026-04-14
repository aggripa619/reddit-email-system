import { NextResponse } from 'next/server';
import { getPendingSteps } from '@/lib/email/db';

export async function GET() {
  try {
    return NextResponse.json({ steps: await getPendingSteps() });
  } catch (e: any) {
    console.error('[email/queue] error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
