import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  const dbPath = path.join(process.cwd(), 'reddit-dm.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  initSchema(db);
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS subreddits (
      id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL,
      active INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL,
      subject TEXT NOT NULL, body TEXT NOT NULL,
      variables TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS scan_runs (
      id INTEGER PRIMARY KEY, ran_at TEXT DEFAULT CURRENT_TIMESTAMP,
      posts_found INTEGER, users_queued INTEGER, status TEXT
    );
    CREATE TABLE IF NOT EXISTS pending_dms (
      id INTEGER PRIMARY KEY, scan_run_id INTEGER,
      reddit_username TEXT NOT NULL, template_id INTEGER,
      post_url TEXT, post_title TEXT, post_subreddit TEXT,
      comment_body TEXT, comment_url TEXT,
      draft_subject TEXT, draft_body TEXT,
      status TEXT DEFAULT 'pending', created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sent_dms (
      id INTEGER PRIMARY KEY, pending_dm_id INTEGER,
      reddit_username TEXT NOT NULL, final_subject TEXT, final_body TEXT,
      sent_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS contact_log (
      id INTEGER PRIMARY KEY, reddit_username TEXT UNIQUE NOT NULL,
      last_contacted TEXT, total_contacts INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS auth_tokens (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      access_token TEXT, refresh_token TEXT,
      expires_at TEXT, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
