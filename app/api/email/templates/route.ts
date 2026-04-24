import { NextRequest, NextResponse } from 'next/server';
import { getDb, ensureReady } from '@/lib/db';

export async function GET() {
  await ensureReady();
  const result = await getDb().execute('SELECT * FROM email_templates ORDER BY step ASC');
  return NextResponse.json({ templates: result.rows });
}

export async function POST(req: Request) {
  const { step, name, subject, body_html } = await req.json();
  const result = await getDb().execute({
    sql: 'INSERT INTO email_templates (step, name, subject, body_html) VALUES (?, ?, ?, ?)',
    args: [step, name, subject, body_html],
  });
  return NextResponse.json({ id: Number(result.lastInsertRowid) });
}

export async function PUT(req: Request) {
  const { id, name, subject, body_html } = await req.json();
  await getDb().execute({
    sql: 'UPDATE email_templates SET name = ?, subject = ?, body_html = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    args: [name, subject, body_html, id],
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await getDb().execute({ sql: 'DELETE FROM email_templates WHERE id = ?', args: [id] });
  return NextResponse.json({ success: true });
}
