// Печатает сводку по прогонам: RQ / Epistemic Bias / Action Discipline на модель.
// Использование: npm run report            (читает ../results/baseline-extended.json)
//                node report.mjs path.json (свой файл, например runs-baseline.json)
import { readFileSync, existsSync } from 'node:fs';

const arg = process.argv[2];
const candidates = [arg, new URL('./runs-baseline.json', import.meta.url).pathname,
  new URL('../results/baseline-extended.json', import.meta.url).pathname].filter(Boolean);
const file = candidates.find(f => existsSync(f));
if (!file) { console.error('нет файла результатов — сначала npm run benchmark'); process.exit(1); }

const D = JSON.parse(readFileSync(file, 'utf8'));
const runs = (D.cases || []).flatMap(c => c.runs);
const models = [...new Set(runs.map(r => r.model))];
const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;

const rows = models.map(m => {
  const rr = runs.filter(r => r.model === m);
  return {
    model: m.split('/').pop(),
    n: rr.length,
    rq: Math.round(mean(rr.map(r => r.rq))),
    bias: Math.round(mean(rr.map(r => (r.commit.intent + r.commit.temporal) / 2))),
    discipline: Math.round(100 * rr.filter(r => (r.decision || r.action) === 'data' || ['investigate', 'wait', 'contain', 'refuse'].includes(r.action)).length / rr.length),
  };
}).sort((a, b) => b.rq - a.rq);

console.log(`\n${file.split('/').pop()} — ${runs.length} runs, ${models.length} models\n`);
console.log('model'.padEnd(22) + 'RQ'.padStart(5) + 'bias'.padStart(7) + 'discipline'.padStart(12) + 'n'.padStart(4));
console.log('─'.repeat(50));
for (const r of rows)
  console.log(r.model.padEnd(22) + String(r.rq).padStart(5) + (r.bias + '%').padStart(7) + (r.discipline + '%').padStart(12) + String(r.n).padStart(4));
console.log('\nRQ = Revision Quality (0-100, higher = better belief update)');
console.log('bias = Epistemic Bias (mean adverse prior at commit; higher = more accusatory start)');
console.log('discipline = share of reversible / information-seeking actions');
