import { getDb } from '../db';
import { handleStopCondition } from './sequence';

export interface ImapPollResult { matched: number; errors: string[]; }

export async function pollForReplies(): Promise<ImapPollResult> {
  const errors: string[] = [];
  let matched = 0;

  if (!process.env.IMAP_HOST || !process.env.IMAP_USER || !process.env.IMAP_PASSWORD) {
    return { matched: 0, errors: ['IMAP credentials not configured'] };
  }

  try {
    const imapSimple = await import('imap-simple');
    const simpleParser = (await import('mailparser')).simpleParser;

    const config = {
      imap: {
        host: process.env.IMAP_HOST,
        port: parseInt(process.env.IMAP_PORT ?? '993'),
        tls: true,
        user: process.env.IMAP_USER!,
        password: process.env.IMAP_PASSWORD!,
        authTimeout: 10000,
        tlsOptions: { rejectUnauthorized: false },
      },
    };

    const connection = await imapSimple.connect(config);
    await connection.openBox('INBOX');

    const since = new Date();
    since.setDate(since.getDate() - 14);
    const messages = await connection.search(['UNSEEN', ['SINCE', since.toDateString()]], {
      bodies: ['HEADER', 'TEXT', ''],
      markSeen: false,
    });

    const db = getDb();

    for (const msg of messages) {
      try {
        const all = msg.parts.find((p: any) => p.which === '');
        if (!all) continue;
        const parsed = await simpleParser(all.body);
        const fromEmail = parsed.from?.value[0]?.address?.toLowerCase() ?? '';

        const prospectResult = await db.execute({
          sql: "SELECT * FROM prospects WHERE LOWER(email) = ? AND status NOT IN ('replied','bounced','unsubscribed')",
          args: [fromEmail],
        });
        const prospect = prospectResult.rows[0] as any;

        if (prospect) {
          const now = new Date().toISOString();
          await db.execute({
            sql: "UPDATE sequence_steps SET replied_at = ? WHERE prospect_id = ? AND status = 'sent' AND replied_at IS NULL",
            args: [now, prospect.id],
          });
          await handleStopCondition(prospect.id, 'replied');
          matched++;
        }
      } catch (e: any) {
        errors.push(`Parse error: ${e.message}`);
      }
    }

    connection.end();
  } catch (e: any) {
    errors.push(`IMAP error: ${e.message}`);
  }

  return { matched, errors };
}
