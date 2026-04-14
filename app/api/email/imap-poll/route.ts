import { NextResponse } from 'next/server';
import { pollForReplies } from '@/lib/email/imap';

export async function POST() {
  try {
    const result = await pollForReplies();
    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
