import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const result = await db.execute(`
    SELECT p.*, t.name as template_name, cl.total_contacts, cl.last_contacted
    FROM pending_dms p
    LEFT JOIN templates t ON p.template_id = t.id
    LEFT JOIN contact_log cl ON p.reddit_username = cl.reddit_username
    WHERE p.status = 'pending'
    ORDER BY p.created_at DESC
  `);
  const pendingDms = result.rows;
  return NextResponse.json({ pendingDms, pendingCount: pendingDms.length });
}
