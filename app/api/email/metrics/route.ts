import { NextResponse } from 'next/server';
import { getMetrics } from '@/lib/email/db';

export async function GET() {
  try {
    return NextResponse.json(await getMetrics());
  } catch (e: unknown) {
    const msg = String(e);
    console.error('[email/metrics] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
