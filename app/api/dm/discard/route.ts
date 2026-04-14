import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { pendingDmId } = await req.json();
    await getDb().execute({ sql: "UPDATE pending_dms SET status = 'discarded' WHERE id = ?", args: [pendingDmId] });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
