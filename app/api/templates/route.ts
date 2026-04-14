import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const result = await getDb().execute('SELECT * FROM templates ORDER BY created_at DESC');
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const { name, subject, body, variables } = await req.json();
  const result = await getDb().execute({
    sql: 'INSERT INTO templates (name, subject, body, variables) VALUES (?, ?, ?, ?)',
    args: [name, subject, body, JSON.stringify(variables ?? [])],
  });
  return NextResponse.json({ id: Number(result.lastInsertRowid) });
}

export async function PUT(req: NextRequest) {
  const { id, name, subject, body, variables } = await req.json();
  await getDb().execute({
    sql: 'UPDATE templates SET name=?, subject=?, body=?, variables=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
    args: [name, subject, body, JSON.stringify(variables ?? []), id],
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await getDb().execute({ sql: 'DELETE FROM templates WHERE id = ?', args: [id] });
  return NextResponse.json({ success: true });
}
