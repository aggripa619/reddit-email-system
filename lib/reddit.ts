import { getDb } from './db';

const REDDIT_BASE = 'https://oauth.reddit.com';
const USER_AGENT = `AnswerInsight-DM/1.0 (by /u/${process.env.REDDIT_USERNAME})`;

function getCredentials(): string {
  return Buffer.from(
    `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
  ).toString('base64');
}

export function getAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.REDDIT_CLIENT_ID!,
    response_type: 'code',
    state: crypto.randomUUID(),
    redirect_uri: process.env.REDDIT_REDIRECT_URI!,
    duration: 'permanent',
    scope: 'identity privatemessages read',
  });
  return `https://www.reddit.com/api/v1/authorize?${params}`;
}

export async function exchangeCodeForTokens(code: string): Promise<void> {
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${getCredentials()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.REDDIT_REDIRECT_URI!,
    }).toString(),
  });
  if (!res.ok) throw new Error(`Reddit token exchange failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const expiresAt = new Date(Date.now() + (data.expires_in - 60) * 1000).toISOString();
  const db = getDb();
  db.prepare(`
    INSERT INTO auth_tokens (id, access_token, refresh_token, expires_at, updated_at)
    VALUES (1, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      expires_at = excluded.expires_at,
      updated_at = CURRENT_TIMESTAMP
  `).run(data.access_token, data.refresh_token, expiresAt);
}

async function refreshAccessToken(): Promise<string> {
  const db = getDb();
  const row = db.prepare('SELECT refresh_token FROM auth_tokens WHERE id = 1').get() as
    { refresh_token: string } | undefined;
  if (!row?.refresh_token) throw new Error('No refresh token stored. Please connect your Reddit account in Settings.');

  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${getCredentials()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: row.refresh_token,
    }).toString(),
  });
  if (!res.ok) throw new Error(`Reddit token refresh failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const expiresAt = new Date(Date.now() + (data.expires_in - 60) * 1000).toISOString();
  db.prepare(`
    UPDATE auth_tokens SET access_token = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1
  `).run(data.access_token, expiresAt);
  return data.access_token;
}

export async function getValidToken(): Promise<string> {
  const db = getDb();
  const row = db.prepare('SELECT access_token, refresh_token, expires_at FROM auth_tokens WHERE id = 1').get() as
    { access_token: string; refresh_token: string; expires_at: string } | undefined;
  if (!row?.refresh_token) throw new Error('No Reddit auth tokens found. Please connect your Reddit account in Settings.');
  if (row.access_token && row.expires_at && new Date(row.expires_at) > new Date()) {
    return row.access_token;
  }
  return refreshAccessToken();
}

export interface RedditPost {
  id: string; title: string; url: string; subreddit: string; ups: number;
}

export interface RedditComment {
  username: string; body: string; commentUrl: string; postId: string;
}

export async function fetchTopPosts(subreddit: string, token: string): Promise<RedditPost[]> {
  await sleep(1000);
  const res = await fetch(`${REDDIT_BASE}/r/${subreddit}/top?t=day&limit=10`, {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': USER_AGENT },
  });
  if (!res.ok) { console.error(`Failed posts for r/${subreddit}: ${res.status}`); return []; }
  const data = await res.json();
  return data.data.children.map((c: any) => ({
    id: c.data.id, title: c.data.title,
    url: `https://reddit.com${c.data.permalink}`,
    subreddit: c.data.subreddit, ups: c.data.ups,
  }));
}

export async function fetchAllComments(postId: string, subreddit: string, token: string): Promise<RedditComment[]> {
  await sleep(1000);
  const res = await fetch(`${REDDIT_BASE}/r/${subreddit}/comments/${postId}?limit=500&depth=10`, {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': USER_AGENT },
  });
  if (!res.ok) { console.error(`Failed comments for ${postId}: ${res.status}`); return []; }
  const data = await res.json();
  const comments: RedditComment[] = [];
  if (data[1]?.data?.children) flattenComments(data[1].data.children, postId, comments);
  return comments;
}

function flattenComments(children: any[], postId: string, acc: RedditComment[]) {
  for (const child of children) {
    if (child.kind === 't1' && child.data) {
      const { author, body, permalink } = child.data;
      if (author && author !== '[deleted]' && body && body !== '[deleted]') {
        acc.push({ username: author, body, commentUrl: `https://reddit.com${permalink}`, postId });
      }
      if (child.data.replies?.data?.children) flattenComments(child.data.replies.data.children, postId, acc);
    }
  }
}

export async function sendRedditDM(token: string, to: string, subject: string, text: string): Promise<void> {
  const body = new URLSearchParams({ api_type: 'json', to, subject, text });
  const res = await fetch(`${REDDIT_BASE}/api/compose`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Failed to send DM to ${to}: ${res.status}`);
  const data = await res.json();
  if (data.json?.errors?.length > 0) throw new Error(`Reddit API error: ${JSON.stringify(data.json.errors)}`);
}

export async function testConnection(token: string): Promise<{ ok: boolean; username?: string }> {
  try {
    const res = await fetch(`${REDDIT_BASE}/api/v1/me`, {
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': USER_AGENT },
    });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return { ok: true, username: data.name };
  } catch { return { ok: false }; }
}

function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }
