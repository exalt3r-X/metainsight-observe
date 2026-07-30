// Prepares your benchmark results for voluntary submission.
// NOTHING IS SENT AUTOMATICALLY. This script only prints a summary and a link —
// you decide whether to open the issue and paste it.
import { readFileSync, existsSync } from 'node:fs';

const file = process.argv[2] || new URL('./runs-baseline.json', import.meta.url).pathname;
if (!existsSync(file)) { console.error('no results file — run `npm run benchmark` first'); process.exit(1); }
const D = JSON.parse(readFileSync(file, 'utf8'));
const runs = (D.cases || []).flatMap(c => c.runs.map(r => ({ ...r, caseId: c.id })));
const models = [...new Set(runs.map(r => r.model))];
const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;

const summary = models.map(m => {
  const rr = runs.filter(r => r.model === m);
  return { model: m, runs: rr.length,
    avg_rq: Math.round(mean(rr.map(r => r.rq))),
    epistemic_bias: Math.round(mean(rr.map(r => (r.commit.intent + r.commit.temporal) / 2))),
    discipline_pct: Math.round(100 * rr.filter(r => (r.decision || r.action) === 'data' || ['investigate', 'wait', 'contain', 'refuse'].includes(r.action)).length / rr.length),
    cases: [...new Set(rr.map(r => r.caseId))] };
});

const body = { benchmark_version: '0.1.0', ts: D.ts, summary };
console.log('── Voluntary results submission ──────────────────────────');
console.log('Nothing has been sent. If you want to share these results,');
console.log('open an issue and paste the block below (plus, optionally,');
console.log('your full runs JSON as an attachment):\n');
console.log('  https://github.com/exalt3r-X/metainsight-observe/issues/new?title=' +
  encodeURIComponent('Results: ' + models.map(m => m.split('/').pop()).join(', ')));
console.log('\n```json\n' + JSON.stringify(body, null, 2) + '\n```\n');
console.log('What this contains: model slugs, run counts, aggregate metrics.');
console.log('What it does NOT contain: your API keys, prompts, raw model text, or anything about you.');
