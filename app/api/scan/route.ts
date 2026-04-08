import { NextResponse } from 'next/server';
import { runDailyScan } from '@/lib/scanner';

export async function POST() {
  try {
    const result = await runDailyScan();
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
