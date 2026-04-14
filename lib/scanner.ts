import { getDb } from './db';
import { getValidToken, fetchTopPosts, fetchAllComments } from './reddit';
import { draftDM } from './drafter';

export async function filterByContactCap(usernames: string[], capDays: number): Promise<string[]> {
  const db = getDb();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - capDays);
  const results: string[] = [];
  for (const username of usernames) {
    const r = await db.execute({ sql: 'SELECT last_contacted FROM contact_log WHERE reddit_username = ?', args: [username] });
    const log = r.rows[0] as unknown as { last_contacted: string } | undefined;
    if (!log || new Date(log.last_contacted) < cutoff) results.push(username);
  }
  return results;
}

export async function runDailyScan(): Promise<{ usersQueued: number; postsFound: number }> {
  const db = getDb();
  const scanResult = await db.execute("INSERT INTO scan_runs (status) VALUES ('running')");
  const scanRunId = Number(scanResult.lastInsertRowid);

  let totalPostsFound = 0, totalUsersQueued = 0;

  try {
    const token = await getValidToken();
    const subredditsResult = await db.execute('SELECT name FROM subreddits WHERE active = 1');
    const subreddits = subredditsResult.rows as unknown as { name: string }[];
    if (!subreddits.length) console.warn('[Scanner] No active subreddits configured.');

    const tmplResult = await db.execute('SELECT * FROM templates LIMIT 1');
    const template = tmplResult.rows[0] as unknown as
      { id: number; name: string; subject: string; body: string } | undefined;

    for (const { name: subreddit } of subreddits) {
      console.log(`[Scanner] Scanning r/${subreddit}...`);
      const posts = await fetchTopPosts(subreddit, token);
      const top3 = posts.sort((a, b) => b.ups - a.ups).slice(0, 3);
      totalPostsFound += top3.length;

      const commenterMap = new Map<string, { username: string; body: string; commentUrl: string; postTitle: string; postUrl: string }>();
      const PROSPECTS_PER_THREAD = 10;

      for (const post of top3) {
        const comments = await fetchAllComments(post.id, subreddit, token);
        let perPostCount = 0;
        for (const c of comments) {
          if (perPostCount >= PROSPECTS_PER_THREAD) break;
          if (!commenterMap.has(c.username)) {
            commenterMap.set(c.username, {
              username: c.username, body: c.body, commentUrl: c.commentUrl,
              postTitle: post.title, postUrl: post.url,
            });
            perPostCount++;
          }
        }
      }

      const eligible = await filterByContactCap(Array.from(commenterMap.keys()), 7);

      for (const username of eligible) {
        const cd = commenterMap.get(username)!;
        let draftSubject = template?.subject ?? 'Quick question about your comment';
        let draftBody    = template?.body    ?? `Hi u/${username}, saw your comment on r/${subreddit}...`;

        if (template) {
          try {
            const draft = await draftDM({
              username, subreddit, postTitle: cd.postTitle, commentBody: cd.body,
              templateSubject: template.subject, templateBody: template.body,
            });
            draftSubject = draft.subject;
            draftBody    = draft.body;
          } catch (e) { console.error(`[Scanner] Draft failed for ${username}:`, e); }
        }

        await db.execute({
          sql: `INSERT INTO pending_dms
            (scan_run_id, reddit_username, template_id, post_url, post_title, post_subreddit,
             comment_body, comment_url, draft_subject, draft_body, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
          args: [
            scanRunId, username, template?.id ?? null, cd.postUrl, cd.postTitle,
            subreddit, cd.body, cd.commentUrl, draftSubject, draftBody,
          ],
        });
        totalUsersQueued++;
      }
    }

    await db.execute({
      sql: 'UPDATE scan_runs SET status=?, posts_found=?, users_queued=? WHERE id=?',
      args: ['completed', totalPostsFound, totalUsersQueued, scanRunId],
    });
    console.log(`[Scanner] Done. Posts: ${totalPostsFound}, Queued: ${totalUsersQueued}`);
    return { usersQueued: totalUsersQueued, postsFound: totalPostsFound };
  } catch (err) {
    await db.execute({ sql: "UPDATE scan_runs SET status='failed' WHERE id=?", args: [scanRunId] });
    throw err;
  }
}
