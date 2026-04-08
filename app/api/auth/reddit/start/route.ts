import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/reddit';

export async function GET(req: NextRequest) {
  return NextResponse.redirect(getAuthUrl());
}
