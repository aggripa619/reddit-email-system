import { createClient, type Client } from '@libsql/client';

let _db: Client | null = null;

export function getDb(): Client {
  if (!_db) {
    _db = createClient({
      url: process.env.TURSO_DATABASE_URL ?? 'file:reddit-dm.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _db;
}

export async function initDb(): Promise<void> {
  const db = getDb();
  await db.batch([
    `CREATE TABLE IF NOT EXISTS subreddits (
      id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL,
      active INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL,
      subject TEXT NOT NULL, body TEXT NOT NULL,
      variables TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS scan_runs (
      id INTEGER PRIMARY KEY, ran_at TEXT DEFAULT CURRENT_TIMESTAMP,
      posts_found INTEGER, users_queued INTEGER, status TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS pending_dms (
      id INTEGER PRIMARY KEY, scan_run_id INTEGER,
      reddit_username TEXT NOT NULL, template_id INTEGER,
      post_url TEXT, post_title TEXT, post_subreddit TEXT,
      comment_body TEXT, comment_url TEXT,
      draft_subject TEXT, draft_body TEXT,
      status TEXT DEFAULT 'pending', created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS sent_dms (
      id INTEGER PRIMARY KEY, pending_dm_id INTEGER,
      reddit_username TEXT NOT NULL, final_subject TEXT, final_body TEXT,
      sent_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS contact_log (
      id INTEGER PRIMARY KEY, reddit_username TEXT UNIQUE NOT NULL,
      last_contacted TEXT, total_contacts INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS auth_tokens (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      access_token TEXT, refresh_token TEXT,
      expires_at TEXT, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS prospects (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT UNIQUE NOT NULL,
      first_name    TEXT, last_name TEXT, company TEXT,
      job_title     TEXT, persona TEXT, source TEXT,
      company_blurb TEXT,
      status        TEXT DEFAULT 'pending',
      risk_score    INTEGER DEFAULT 0,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS sequence_steps (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      prospect_id   INTEGER REFERENCES prospects(id),
      step          INTEGER,
      scheduled_at  DATETIME,
      sent_at       DATETIME,
      opened_at     DATETIME,
      replied_at    DATETIME,
      bounced_at    DATETIME,
      status        TEXT DEFAULT 'pending',
      subject       TEXT,
      body_html     TEXT,
      resend_id     TEXT,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      delivered_at  DATETIME,
      clicked_at    DATETIME
    )`,
    `CREATE TABLE IF NOT EXISTS email_templates (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      step        INTEGER NOT NULL,
      name        TEXT NOT NULL,
      subject     TEXT NOT NULL,
      body_html   TEXT NOT NULL,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
  ], 'write');
}
