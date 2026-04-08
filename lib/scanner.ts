import { getDb } from './db';
import { getValidToken, fetchTopPosts, fetchAllComments } from './reddit';
import { draftDM } from './drafter';

export function filterByContactCap(usernames: string[], capDays: number): string[] {
  const db = getDb();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - capDays);
  return usernames.filter(username => {
    const log = db.prepare('SELECT last_contacted FROM contact_log WHERE reddit_username = ?')
      .get(username) as { last_contacted: string } | undefined;
    if (!log) return true;
    return new Date(log.last_contacted) < cutoff;
  });
}

export async function runDailyScan(): Promise<{ usersQueued: number; postsFound: number }> {
  const db = getDb();
  const scanRunId = db.prepare("INSERT INTO scan_runs (status) VALUES ('running')")
    .run().lastInsertRowid as number;

  let totalPostsFound = 0, totalUsersQueued = 0;

  try {
    const token = await getValidToken();
    const subreddits = db.prepare('SELECT name FROM subreddits WHERE active = 1').all() as { name: string }[];
    if (!subreddits.length) console.warn('[Scanner] No active subreddits configured.');

    const template = db.prepare('SELECT * FROM templates LIMIT 1').get() as
      { id: number; name: string; subject: string; body: string } | undefined;

    for (const { name: subreddit } of subreddits) {
      console.log(`[Scanner] Scanning r/${subreddit}...`);
      const posts = await fetchTopPosts(subreddit, token);
      const top3 = posts.sort((a, b) => b.ups - a.ups).slice(0, 3);
      totalPostsFound += top3.length;

      const commenterMap = new Map<string, { username: string; body: string; commentUrl: string; postTitle: string; postUrl: string }>();

      for (const post of top3) {
        const comments = await fetchAllComments(post.id, subreddit, token);
        for (const c of comments) {
          if (!commenterMap.has(c.username)) {
            commenterMap.set(c.username, {
              username: c.username, body: c.body, commentUrl: c.commentUrl,
              postTitle: post.title, postUrl: post.url,
            });
          }
        }
      }

      const eligible = filterByContactCap(Array.from(commenterMap.keys()), 7);

      for (const username of eligible) {
        const cd = commenterMap.get(username)!;
        let draftSubject = template?.subject ?? 'Quick question about your comment';
        let draftBody = template?.body ?? `Hi u/${username}, saw your comment on r/${subreddit}...`;

        if (template) {
          try {
            const draft = await draftDM({
              username, subreddit, postTitle: cd.postTitle, commentBody: cd.body,
              templateSubject: template.subject, templateBody: template.body,
            });
            draftSubject = draft.subject;
            draftBody = draft.body;
          } catch (e) { console.error(`[Scanner] Draft failed for ${username}:`, e); }
        }

        db.prepare(`
          INSERT INTO pending_dms
            (scan_run_id, reddit_username, template_id, post_url, post_title, post_subreddit,
             comment_body, comment_url, draft_subject, draft_body, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `).run(scanRunId, username, template?.id ?? null, cd.postUrl, cd.postTitle,
               subreddit, cd.body, cd.commentUrl, draftSubject, draftBody);

        totalUsersQueued++;
      }
    }

    db.prepare('UPDATE scan_runs SET status=?, posts_found=?, users_queued=? WHERE id=?')
      .run('completed', totalPostsFound, totalUsersQueued, scanRunId);
    console.log(`[Scanner] Done. Posts: ${totalPostsFound}, Queued: ${totalUsersQueued}`);
    return { usersQueued: totalUsersQueued, postsFound: totalPostsFound };
  } catch (err) {
    db.prepare("UPDATE scan_runs SET status='failed' WHERE id=?").run(scanRunId);
    throw err;
  }
}
