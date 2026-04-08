import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  return NextResponse.json(getDb().prepare('SELECT * FROM templates ORDER BY created_at DESC').all());
}

export async function POST(req: NextRequest) {
  const { name, subject, body, variables } = await req.json();
  const result = getDb().prepare('INSERT INTO templates (name, subject, body, variables) VALUES (?, ?, ?, ?)')
    .run(name, subject, body, JSON.stringify(variables ?? []));
  return NextResponse.json({ id: result.lastInsertRowid });
}

export async function PUT(req: NextRequest) {
  const { id, name, subject, body, variables } = await req.json();
  getDb().prepare('UPDATE templates SET name=?, subject=?, body=?, variables=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .run(name, subject, body, JSON.stringify(variables ?? []), id);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  getDb().prepare('DELETE FROM templates WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
