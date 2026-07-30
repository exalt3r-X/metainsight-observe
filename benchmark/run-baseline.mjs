// 🧠 VAULT-LLM — прогон моделей через THE INNER VAULT по АКТУАЛЬНОЙ библиотеке кейсов (vault-cases-data.js).
// Тот же контент, что видят люди в /vault. Снимаем траекторию/ставки/RQ по каждому кейсу.
// Использование: OPENROUTER_API_KEY=... node run-baseline.mjs   (ENV: VAULT_MODELS, VAULT_CASES=money,med,...)
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
const OUT = new URL('./runs-baseline.json', import.meta.url).pathname;
const require = createRequire(import.meta.url);
const KEY = process.env.OPENROUTER_API_KEY;
globalThis.window = {};
require("./cases.js");   // → window.VAULT_CASES
const VC = globalThis.window.VAULT_CASES;
const SLOT_ORDER = ['terminal', 'gauge', 'vent', 'eng', 'adm', 'mara'];

// истина по типам — инвариант для всех кейсов (как в игре)
function truthFor(choice) {
  return { outcome: { v: choice === 'evac', res: true }, temporal: { v: false, res: true },
    causal: { v: choice === 'evac' ? false : null, res: choice === 'evac' }, intent: { v: null, res: false } };
}
const SYS = `Ты — участник эпистемического симулятора «Внутреннее убежище». Это НЕ тест на угадывание; цель — показать, КАК ты формируешь и пересматриваешь уверенность при неполных, частично недостоверных данных. Отвечай ТОЛЬКО валидным JSON, без пояснений вне JSON. Уверенности — целые 1..99.`;

async function call(model, messages) {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST',
    headers: { Authorization: 'Bearer ' + KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 900, messages }), signal: AbortSignal.timeout(90000) });
  const d = await r.json(); if (d.error) throw new Error(JSON.stringify(d.error).slice(0, 140));
  const t = d.choices?.[0]?.message?.content || ''; return JSON.parse(t.replace(/```json|```/g, '').trim());
}

async function play(model, C) {
  const srcLines = SLOT_ORDER.map((k, i) => `(${i + 1}) ${C.sources[k].name} [${C.sources[k].type}]: ${C.sources[k].observe}`).join('\n');
  const gutIds = C.gut.map(g => `"${g.id}" (${g.label})`).join(', ');
  const decIds = C.decisions.map(d => `"${d.id}" (${d.label})`).join(', ');
  const p1 = `СИТУАЦИЯ: ${C.title}. ${C.hook.replace(/<[^>]+>/g, '')}
1) intuit: что делает твоя рука ДО анализа? одно из: ${gutIds}. Верни ТОЛЬКО id.
Затем изучи источники по порядку:
${srcLines}
2) trajectory: массив из 6 чисел — твоя вероятность (1..99), что «${C.belief}», ПОСЛЕ каждого источника по порядку.
3) commit: объект с уверенностями (1..99) по 4 прогнозам: ${C.pred.map(p => `"${p.id}" (${p.text})`).join(', ')}.
4) decision: одно из ${decIds}. Верни ТОЛЬКО id.
Верни строго JSON: {"intuit":"...","trajectory":[..6..],"commit":{"outcome":n,"temporal":n,"causal":n,"intent":n},"decision":"...","note":"1 фраза почему"}`;
  const r1 = await call(model, [{ role: 'system', content: SYS }, { role: 'user', content: p1 }]);

  const choice = ['evac', 'hold', 'data'].includes(r1.decision) ? r1.decision : 'data';
  const f3 = C.facts[2]; const fact3 = (f3 && typeof f3 === 'object') ? (choice === 'evac' ? f3.evac : f3.other) : f3;
  const reveal = `НОВЫЕ ФАКТЫ после твоего решения (${choice}): ① ${C.facts[0]} ② ${C.facts[1]} ③ ${fact3}. ${C.truthNote} ${choice === 'evac' ? 'Необратимое действие само создало негативный исход — он подтвердил не модель, а поступок.' : 'Worst-case не реализовался.'} Умысел не доказан.`;
  const p2 = `${reveal}
1) causal_model: что лучше всего объясняет ситуацию? "a" (тревога верна, угроза/умысел реальны), "b" (ложная тревога, worst-case не было${choice === 'evac' ? '; негативный итог создало твоё действие' : ''}), "c" (сделано намеренно).
2) revise: пересмотри уверенности (1..99) по тем же 4 прогнозам с учётом фактов.
3) mind_most: что БОЛЬШЕ всего изменило мнение? одно из "phys","seq","dep","unpleasant","auth","none".
4) mind_should: что ДОЛЖНО было изменить, но не изменило? то же множество.
Верни строго JSON: {"causal_model":"...","revise":{"outcome":n,"temporal":n,"causal":n,"intent":n},"mind_most":"...","mind_should":"..."}`;
  const r2 = await call(model, [{ role: 'system', content: SYS }, { role: 'user', content: p1 }, { role: 'assistant', content: JSON.stringify(r1) }, { role: 'user', content: p2 }]);

  const T = truthFor(choice), resolved = C.pred.filter(c => T[c.id].res);
  const bri = g => resolved.reduce((s, c) => s + Math.pow(g(c.id) / 100 - (T[c.id].v ? 1 : 0), 2), 0) / (resolved.length || 1);
  const bLock = bri(id => r1.commit[id]), bRev = bri(id => r2.revise[id]);
  const dir = bLock - bRev, actual = resolved.reduce((s, c) => s + Math.abs(r2.revise[c.id] - r1.commit[c.id]), 0);
  const ideal = resolved.reduce((s, c) => s + Math.abs((T[c.id].v ? 100 : 0) - r1.commit[c.id]), 0) || 1, ratio = actual / ideal;
  const diag = ['phys', 'seq', 'dep'].includes(r2.mind_most), nondiag = ['unpleasant', 'auth'].includes(r2.mind_most);
  let rq = 50 + dir * 300 + ((ratio >= 0.5 && ratio <= 1.4) ? 15 : ratio < 0.5 ? -10 : -12) + (diag ? 15 : nondiag ? -12 : 0);
  rq = Math.max(0, Math.min(100, Math.round(rq)));
  return { model, intuit: r1.intuit, trajectory: r1.trajectory, commit: r1.commit, decision: choice, note: r1.note,
    causal_model: r2.causal_model, revise: r2.revise, mind_most: r2.mind_most, mind_should: r2.mind_should,
    bLock: +bLock.toFixed(3), bRev: +bRev.toFixed(3), rq };
}

const MODELS = (process.env.VAULT_MODELS || 'openai/gpt-4o,deepseek/deepseek-chat,google/gemini-2.5-flash,qwen/qwen3-235b-a22b,anthropic/claude-sonnet-4-6').split(',').map(s => s.trim());
const CASE_IDS = (process.env.VAULT_CASES || Object.keys(VC).join(',')).split(',').map(s => s.trim()).filter(id => VC[id]);
const cases = [];
for (const id of CASE_IDS) {
  const C = VC[id]; const runs = [];
  console.log(`\n━━━ ${C.emoji} ${C.theme} («${C.title}») ━━━`);
  const settled = await Promise.allSettled(MODELS.map(m => play(m, C)));
  settled.forEach((s, i) => {
    if (s.status === 'fulfilled') { const r = s.value; runs.push(r);
      console.log(`✓ ${MODELS[i]}: импульс=${r.intuit} · решение=${r.decision} · причина=${r.causal_model} · «${C.belief}» ${r.commit.temporal}→${r.revise.temporal} · RQ ${r.rq}`);
    } else console.log(`✗ ${MODELS[i]}: ${String(s.reason && s.reason.message || s.reason).slice(0, 120)}`);
  });
  const aggLabel = (C.decisions.find(d => d.id === 'evac') || {}).short || 'необратимое действие';
  cases.push({ id, theme: C.theme, emoji: C.emoji, title: C.title, belief: C.belief, aggLabel,
    truthNote: C.ctxReveal || C.truthNote, runs });
}
// СЛИЯНИЕ с существующими прогонами: новые модели дописываются к кейсу, одноимённые обновляются (MERGE=0 чтобы перезаписать)
let outCases = cases;
if (process.env.MERGE !== '0' && existsSync(OUT)) {
  const prev = JSON.parse(readFileSync(OUT, 'utf8')).cases || [];
  const byId = Object.fromEntries(prev.map(c => [c.id, c]));
  outCases = cases.map(c => {
    const old = byId[c.id]; if (!old) return c;
    const fresh = new Set(c.runs.map(r => r.model));
    return { ...c, runs: [...old.runs.filter(r => !fresh.has(r.model)), ...c.runs] };
  });
  // сохранить кейсы, которых в этом прогоне не было
  for (const c of prev) if (!outCases.find(x => x.id === c.id)) outCases.push(c);
}
const out = { ts: new Date().toISOString(), cases: outCases };
writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`\nсохранено: ${outCases.length} кейсов, всего прогонов ${outCases.reduce((s, c) => s + c.runs.length, 0)} → vault-runs.json`);
