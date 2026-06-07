/**
 * Dump the ResearchReport and the exact buildForecastInputs() string the AI
 * receives for a ticker. Usage (from server/):
 *   npx ts-node src/scripts/dumpForecastInputs.ts NVDA
 * No MongoDB needed — buildResearchReport only hits the data providers.
 */
import 'dotenv/config';
import { buildResearchReport } from '../services/research';
import { debugForecastInputs } from '../services/anthropic';

async function main(): Promise<void> {
  const ticker = (process.argv[2] || 'AAPL').toUpperCase();
  const report = await buildResearchReport(ticker);
  const { session, inputs } = debugForecastInputs(report);

  console.log('\n================= ResearchReport (JSON) =================\n');
  console.log(JSON.stringify(report, null, 2));
  console.log('\n================= Market session =================\n');
  console.log(session);
  console.log('\n================= buildForecastInputs() =================\n');
  console.log(inputs);
  process.exit(0);
}

main().catch((err) => {
  console.error('dumpForecastInputs failed:', err);
  process.exit(1);
});
