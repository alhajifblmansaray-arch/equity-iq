/**
 * Refreshes every connected Snaptrade user's portfolio.
 *
 *   npm run sync:snaptrade --prefix server
 *
 * Safe to run on a schedule — activity is deduped on Snaptrade's immutable ids,
 * and positions are reconciled against what the brokerage currently reports.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import SnaptradeAuth from '../models/SnaptradeAuth';
import { syncSnaptradeData } from '../routes/portfolio';

async function main(): Promise<void> {
  await connectDB(process.env.MONGODB_URI || 'mongodb://localhost:27017/equity-iq');

  const rows = await SnaptradeAuth.find({});
  if (!rows.length) {
    console.log('No Snaptrade users are connected.');
    return;
  }

  let ok = 0;
  for (const auth of rows) {
    try {
      const summary = await syncSnaptradeData(String(auth.user), auth.snaptradeUserId, auth.snaptradeUserSecret);
      auth.isConnected = true;
      auth.lastSyncAt = new Date();
      await auth.save();
      ok++;
      console.log(`✓ ${auth.snaptradeUserId}`, JSON.stringify(summary));
    } catch (err) {
      const e = err as { status?: number; responseBody?: { detail?: string }; message?: string };
      console.error(`✗ ${auth.snaptradeUserId}: [${e.status ?? '?'}] ${e.responseBody?.detail || e.message}`);
    }
  }

  console.log(`\nSynced ${ok}/${rows.length} user(s).`);
}

main()
  .catch((err) => { console.error('Fatal:', err); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
