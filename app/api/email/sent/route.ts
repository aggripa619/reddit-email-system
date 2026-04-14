import { NextResponse } from 'next/server';
import { getSentSteps } from '@/lib/email/db';

export async function GET() {
  return NextResponse.json({ rows: getSentSteps() });
}
