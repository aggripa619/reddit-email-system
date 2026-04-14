import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';

export async function GET() {
  const info: Record<string, unknown> = {
    tursoUrl: process.env.TURSO_DATABASE_URL ? `SET (${process.env.TURSO_DATABASE_URL.slice(0, 30)}...)` : 'NOT SET — using file fallback',
    tursoToken: process.env.TURSO_AUTH_TOKEN ? 'SET' : 'NOT SET',
    nodeRuntime: process.env.NEXT_RUNTIME ?? 'unknown',
  };

  try {
    await initDb();
    info.initDb = 'OK';
  } catch (e: unknown) {
    info.initDbError = String(e);
  }

  try {
    const db = getDb();
    const r = await db.execute('SELECT COUNT(*) as c FROM prospects');
    info.prospectsCount = Number(r.rows[0].c);
  } catch (e: unknown) {
    info.prospectsQueryError = String(e);
  }

  try {
    const db = getDb();
    const r = await db.execute('SELECT COUNT(*) as c FROM sequence_steps');
    info.sequenceStepsCount = Number(r.rows[0].c);
  } catch (e: unknown) {
    info.sequenceStepsQueryError = String(e);
  }

  try {
    const db = getDb();
    const r = await db.execute(
      `SELECT ss.id as step_id FROM sequence_steps ss JOIN prospects p ON ss.prospect_id = p.id WHERE ss.status = 'pending' LIMIT 1`
    );
    info.pendingStepsTest = `OK — ${r.rows.length} row(s), isArray=${Array.isArray(r.rows)}`;
  } catch (e: unknown) {
    info.pendingStepsError = String(e);
  }

  return NextResponse.json(info);
}
