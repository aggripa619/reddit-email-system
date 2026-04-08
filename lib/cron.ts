import cron from 'node-cron';
import { runDailyScan } from './scanner';

let initialised = false;

export function initCron() {
  if (initialised || process.env.NEXT_RUNTIME === 'edge') return;
  initialised = true;
  cron.schedule('0 8 * * *', async () => {
    console.log('[Cron] Starting daily Reddit scan...');
    try {
      const result = await runDailyScan();
      console.log(`[Cron] Done. Queued: ${result.usersQueued}`);
    } catch (err) { console.error('[Cron] Scan failed:', err); }
  });
  console.log('[Cron] Daily scan scheduled at 08:00 UTC.');
}
