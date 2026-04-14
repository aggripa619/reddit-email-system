import { NextRequest, NextResponse } from 'next/server';
import { updateStepStatus } from '@/lib/email/db';

export async function POST(req: NextRequest) {
  try {
    const { stepId } = await req.json();
    await updateStepStatus(stepId, 'discarded');
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
