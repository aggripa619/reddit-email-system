import { NextResponse } from 'next/server';
import { getMetrics } from '@/lib/email/db';

export async function GET() {
  try {
    return NextResponse.json(getMetrics());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
