import { getDb } from '../db';

export interface Prospect {
  id: number; email: string; first_name?: string; last_name?: string;
  company?: string; job_title?: string; persona?: string; source?: string;
  company_blurb?: string; status: string; risk_score: number; created_at: string;
}

export interface SequenceStep {
  id: number; prospect_id: number; step: number;
  scheduled_at?: string; sent_at?: string; opened_at?: string;
  replied_at?: string; bounced_at?: string; delivered_at?: string; clicked_at?: string;
  status: string; subject?: string; body_html?: string; resend_id?: string;
}

export async function insertProspect(p: Omit<Prospect, 'id' | 'created_at'>): Promise<number> {
  const db = getDb();
  const result = await db.execute({
    sql: `INSERT OR IGNORE INTO prospects
      (email, first_name, last_name, company, job_title, persona, source,
       company_blurb, status, risk_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      p.email, p.first_name ?? null, p.last_name ?? null, p.company ?? null,
      p.job_title ?? null, p.persona ?? null, p.source ?? 'csv_upload',
      p.company_blurb ?? null, p.status ?? 'pending', p.risk_score ?? 0,
    ],
  });
  return Number(result.lastInsertRowid);
}

export async function getProspectById(id: number): Promise<Prospect | undefined> {
  const result = await getDb().execute({ sql: 'SELECT * FROM prospects WHERE id = ?', args: [id] });
  return result.rows[0] as unknown as Prospect | undefined;
}

export async function getProspectByEmail(email: string): Promise<Prospect | undefined> {
  const result = await getDb().execute({ sql: 'SELECT * FROM prospects WHERE email = ?', args: [email] });
  return result.rows[0] as unknown as Prospect | undefined;
}

export async function updateProspectStatus(id: number, status: string): Promise<void> {
  await getDb().execute({ sql: 'UPDATE prospects SET status = ? WHERE id = ?', args: [status, id] });
}

export async function updateProspectBlurb(id: number, blurb: string, riskScore: number): Promise<void> {
  await getDb().execute({
    sql: 'UPDATE prospects SET company_blurb = ?, risk_score = ? WHERE id = ?',
    args: [blurb, riskScore, id],
  });
}

export async function insertSequenceStep(s: Omit<SequenceStep, 'id'>): Promise<number> {
  const result = await getDb().execute({
    sql: `INSERT INTO sequence_steps
      (prospect_id, step, scheduled_at, status, subject, body_html)
    VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      s.prospect_id, s.step, s.scheduled_at ?? null, s.status ?? 'pending',
      s.subject ?? null, s.body_html ?? null,
    ],
  });
  return Number(result.lastInsertRowid);
}

export async function updateStepStatus(
  id: number, status: string, extra: Record<string, string | null> = {}
): Promise<void> {
  const sets = ['status = ?'];
  const vals: (string | null | number)[] = [status];
  for (const [k, v] of Object.entries(extra)) { sets.push(`${k} = ?`); vals.push(v); }
  vals.push(id);
  await getDb().execute({ sql: `UPDATE sequence_steps SET ${sets.join(', ')} WHERE id = ?`, args: vals });
}

export async function getPendingSteps(): Promise<(SequenceStep & Prospect & { step_id: number })[]> {
  const result = await getDb().execute(`
    SELECT ss.*, ss.id as step_id,
           p.email, p.first_name, p.last_name, p.company, p.job_title,
           p.persona, p.company_blurb, p.risk_score, p.status as prospect_status
    FROM sequence_steps ss
    JOIN prospects p ON ss.prospect_id = p.id
    WHERE ss.status = 'pending' AND p.status NOT IN ('bounced','unsubscribed','replied')
    ORDER BY ss.id ASC
  `);
  return result.rows as unknown as (SequenceStep & Prospect & { step_id: number })[];
}

export async function getSentSteps(limit = 200): Promise<any[]> {
  const result = await getDb().execute({
    sql: `SELECT ss.*, p.email, p.first_name, p.last_name, p.company, p.persona
    FROM sequence_steps ss
    JOIN prospects p ON ss.prospect_id = p.id
    WHERE ss.status = 'sent'
    ORDER BY ss.sent_at DESC LIMIT ?`,
    args: [limit],
  });
  return result.rows as unknown as any[];
}

export async function getPendingStepsForProspect(prospectId: number): Promise<SequenceStep[]> {
  const result = await getDb().execute({
    sql: "SELECT * FROM sequence_steps WHERE prospect_id = ? AND status = 'pending'",
    args: [prospectId],
  });
  return result.rows as unknown as SequenceStep[];
}

export async function discardRemainingSteps(prospectId: number): Promise<void> {
  await getDb().execute({
    sql: "UPDATE sequence_steps SET status = 'skipped' WHERE prospect_id = ? AND status = 'pending'",
    args: [prospectId],
  });
}

export async function getMetrics() {
  const db = getDb();
  const results = await db.batch([
    "SELECT COUNT(*) as c FROM sequence_steps WHERE status = 'sent'",
    "SELECT COUNT(*) as c FROM sequence_steps WHERE opened_at IS NOT NULL",
    "SELECT COUNT(*) as c FROM prospects WHERE status = 'replied'",
    "SELECT COUNT(*) as c FROM prospects WHERE status = 'bounced'",
    "SELECT COUNT(*) as c FROM prospects WHERE status = 'unsubscribed'",
    "SELECT COUNT(*) as c FROM prospects WHERE status = 'active'",
    "SELECT COUNT(*) as c FROM sequence_steps WHERE status = 'pending'",
  ], 'read');

  const sent         = Number(results[0].rows[0].c);
  const opened       = Number(results[1].rows[0].c);
  const replied      = Number(results[2].rows[0].c);
  const bounced      = Number(results[3].rows[0].c);
  const unsubscribed = Number(results[4].rows[0].c);
  const active       = Number(results[5].rows[0].c);
  const pending      = Number(results[6].rows[0].c);

  return {
    sent, opened, replied, bounced, unsubscribed, active, pending,
    openRate:  sent > 0 ? Math.round((opened  / sent) * 100) : 0,
    replyRate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
  };
}

export async function getAllProspects(
  page = 1, pageSize = 50, status?: string
): Promise<{ rows: any[]; total: number }> {
  const db = getDb();
  const where = status ? `WHERE p.status = '${status}'` : '';
  const [countResult, rowsResult] = await db.batch([
    `SELECT COUNT(*) as c FROM prospects p ${where}`,
    {
      sql: `SELECT p.*,
        (SELECT COUNT(*) FROM sequence_steps WHERE prospect_id = p.id AND status = 'sent') as steps_sent,
        (SELECT MAX(step) FROM sequence_steps WHERE prospect_id = p.id AND status = 'sent') as current_step
      FROM prospects p ${where}
      ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      args: [pageSize, (page - 1) * pageSize],
    },
  ], 'read');

  const total = Number(countResult.rows[0].c);
  const rows = rowsResult.rows;
  return { rows: rows as unknown as any[], total };
}

export async function deleteProspect(id: number): Promise<void> {
  await getDb().batch([
    { sql: 'DELETE FROM sequence_steps WHERE prospect_id = ?', args: [id] },
    { sql: 'DELETE FROM prospects WHERE id = ?', args: [id] },
  ], 'write');
}

export async function insertSentStep(
  prospectId: number, step: number, subject: string, bodyHtml: string, resendId: string
): Promise<void> {
  const now = new Date().toISOString();
  await getDb().execute({
    sql: `INSERT INTO sequence_steps (prospect_id, step, scheduled_at, sent_at, status, subject, body_html, resend_id)
    VALUES (?, ?, ?, ?, 'sent', ?, ?, ?)`,
    args: [prospectId, step, now, now, subject, bodyHtml, resendId],
  });
}
