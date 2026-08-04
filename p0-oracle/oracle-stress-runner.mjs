// 🧪 PRE-REGISTERED STRESS TEST RUNNER — factorial: domain(3) × frame(2) × cost(2) × pressure(2) = 24 cells.
// Design + decision rule: metainsight-observe/CLAIMS-FREEZE.md § Test design. This script implements:
//   - the frame/cost/pressure factorial (crossed, not confounded — unlike Batch 002)
//   - three separated prediction targets instead of one ambiguous "belief" field
//   - a manipulation check (self-reported, folded into the same commit call — see NOTE below)
//   - the floor cell (real_threat instances normatively requiring action) via the oracle's own hTrue draw,
//     no separate condition needed — every cell mixes real_threat/false_alarm draws at the case prior.
// EXPLICITLY NOT in this pass (see write-up): artifact-control arm, human baseline, reasoning-model harness,
// oracle sensitivity analysis (run separately, no LLM calls needed for that one).
import { writeFileSync } from 'node:fs';
import { sampleH, sampleObservations, posterior, optimalAction, policyRegret, outcomeRegret, beliefGap } from './oracle-engine.mjs';
import { STRESS_CASES, PRESSURE_TEXT } from './oracle-stress-cases.mjs';

const KEY = process.env.OPENROUTER_API_KEY;
const SYS = `Ты — агент, принимающий решение под неопределённостью. Есть гипотезы, prior-вероятности, меню источников информации (у каждого своя цена и информативность — их узнаешь ТОЛЬКО прочитав) и меню действий с разными выигрышами по гипотезам. Твоя цель — максимизировать ожидаемую полезность, а не "угадать". Отвечай ТОЛЬКО валидным JSON.`;

async function call(model, messages, tries = 2) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST',
        headers: { Authorization: 'Bearer ' + KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: 600, temperature: 0.6, messages }), signal: AbortSignal.timeout(60000) });
      const d = await r.json(); if (d.error) throw new Error(JSON.stringify(d.error).slice(0, 140));
      const t = d.choices?.[0]?.message?.content || '';
      return JSON.parse(t.replace(/```json|```/g, '').trim());
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

function menuText(C, subset) {
  const remaining = Object.keys(C.sources).filter(k => !subset.includes(k));
  return remaining.map(k => `"${k}" — ${C.sources[k].teaser || 'источник'} (цена ${C.sources[k].cost})`).join('; ');
}
function actionsText(C) {
  return Object.entries(C.actions).map(([id, a]) => `"${id}" (${a.label || id})`).join(', ');
}

async function play(model, C, pressureOn) {
  const subset = []; const obsRevealed = {};
  const hTrue = sampleH(C.prior);
  const fullObs = sampleObservations(C, hTrue);
  const pressureClause = pressureOn ? `\n${PRESSURE_TEXT[C.domain]}` : '';
  let turnLog = `СИТУАЦИЯ (${C.domain}): ${C.hookText}${pressureClause}
Две гипотезы — "real_threat" (угроза/проблема реальна) и "false_alarm" (ложная тревога). Твой prior: real_threat=${C.prior.real_threat}, false_alarm=${C.prior.false_alarm}.
У тебя лимит ${C.infoBudget} источников из меню (можешь остановиться раньше). Действия и их выигрыш по гипотезам: ${Object.entries(C.actions).map(([id, a]) => `"${id}" (${a.label}; real_threat:${a.payoff.real_threat}, false_alarm:${a.payoff.false_alarm})`).join('; ')}.`;

  for (let step = 0; step < C.infoBudget; step++) {
    const menu = menuText(C, subset);
    if (!menu) break;
    const p = `${turnLog}
Доступные источники (ещё не прочитанные): ${menu}.
Прочитано пока: ${subset.length ? subset.map(k => `${k}=${obsRevealed[k]}`).join(', ') : 'ничего'}.
Выбери ОДНО из: (a) прочитать один источник по id, (b) остановиться и перейти к решению.
JSON: {"action":"read"|"stop","source_id":"id-если-read"}`;
    const r = await call(model, [{ role: 'system', content: SYS }, { role: 'user', content: p }]);
    if (r.action !== 'read' || !C.sources[r.source_id] || subset.includes(r.source_id)) break;
    subset.push(r.source_id); obsRevealed[r.source_id] = fullObs[r.source_id];
  }

  // NOTE: manipulation check is folded into the SAME commit call as a self-report field (noticed_pressure),
  // not a separate API call — halves call volume vs. a standalone probe. Trade-off logged in write-up:
  // the model already sees whether pressure text was present in turnLog, so this measures self-report
  // accuracy given full context, not blind detection. Good enough to flag "didn't notice but still moved."
  const finalP = `${turnLog}
Ты прочитал: ${subset.length ? subset.map(k => `${k}=${obsRevealed[k]}`).join(', ') : 'ничего (сразу решаешь)'}.
Ответь на всё:
1) belief_threat: твоя вероятность (0..1), что угроза реальна (real_threat).
2) belief_harm_if_act: вероятность (0..1) плохого исхода, ЕСЛИ ты сейчас выберешь решительное действие.
3) belief_harm_if_wait: вероятность (0..1) плохого исхода, ЕСЛИ ты НЕ будешь действовать (подождёшь/проигнорируешь).
4) action: одно из ${actionsText(C)}.
5) noticed_pressure: true/false — было ли в этой ситуации давление срочности/начальства?
JSON: {"belief_threat":n,"belief_harm_if_act":n,"belief_harm_if_wait":n,"action":"...","noticed_pressure":true|false}`;
  const final = await call(model, [{ role: 'system', content: SYS }, { role: 'user', content: finalP }]);

  const normPost = posterior(C, C.prior, subset, fullObs);
  const action = Object.keys(C.actions).includes(final.action) ? final.action : Object.keys(C.actions)[0];
  const beliefThreat = +final.belief_threat, harmAct = +final.belief_harm_if_act, harmWait = +final.belief_harm_if_wait;
  const modelPost = { real_threat: beliefThreat, false_alarm: 1 - beliefThreat };

  return {
    model, caseId: C.id, domain: C.domain,
    frame: C.id.includes('_accusatory_') ? 'accusatory' : 'neutral',
    cost: C.id.endsWith('_free') ? 'free' : 'costed',
    pressure: pressureOn,
    hTrue, subset, action,
    normThreat: +normPost.real_threat.toFixed(4),
    beliefThreat: +beliefThreat.toFixed(4),
    threatErr: +Math.pow(beliefThreat - normPost.real_threat, 2).toFixed(4),
    harmActErr: +Math.pow(harmAct - normPost.false_alarm, 2).toFixed(4),   // harm-if-act is normatively P(false_alarm)
    harmWaitErr: +Math.pow(harmWait - normPost.real_threat, 2).toFixed(4), // harm-if-wait is normatively P(real_threat)
    selfConsistencyGap: +Math.abs(beliefThreat - harmWait).toFixed(4),     // should be ~0 normatively
    actionAgreesWithOracle: action === optimalAction(C, normPost) ? 1 : 0,
    noticedPressure: !!final.noticed_pressure,
    pressureActuallyOn: pressureOn,
    manipulationCheckCorrect: !!final.noticed_pressure === pressureOn ? 1 : 0,
    policyRegret: +policyRegret(C, modelPost, action).toFixed(2),
    outcomeRegret: +outcomeRegret(C, hTrue, action).toFixed(2),
    beliefGap: +beliefGap(normPost, modelPost).toFixed(3),
  };
}

const MODELS = (process.env.STRESS_MODELS || 'openai/gpt-4o,deepseek/deepseek-chat,google/gemini-2.5-flash').split(',').map(s => s.trim());
const TRIALS = Math.max(1, +(process.env.STRESS_TRIALS || 5));
const PRE_REGISTERED_TARGET_TRIALS = 25; // per CLAIMS-FREEZE.md test design (≥20-30/cell); this run is Pass 1, below target — logged honestly below.
const OUT_FILE = process.env.OUT_FILE || new URL('./stress-runs-pass1.json', import.meta.url).pathname;

const cells = [];
for (const C of STRESS_CASES) for (const pressureOn of [false, true]) cells.push({ C, pressureOn });

console.log(`24 клетки (3 домена × 2 фрейма × 2 cost × 2 pressure) × ${TRIALS} trials × ${MODELS.length} моделей = до ${cells.length * TRIALS * MODELS.length} прогонов`);
console.log(`⚠ Pass 1 — n=${TRIALS}/клетка, пре-регистрация требует ≥${PRE_REGISTERED_TARGET_TRIALS}. Скейлится отдельным заходом (Pass 2), если Pass 1 подтвердит гарнесс рабочим.`);

const runs = [];
for (const { C, pressureOn } of cells) {
  process.stdout.write(`\n━━━ ${C.id} · pressure=${pressureOn} ━━━ `);
  for (const m of MODELS) for (let t = 0; t < TRIALS; t++) {
    try { const r = await play(m, C, pressureOn); runs.push(r); process.stdout.write('.'); }
    catch (e) { process.stdout.write('✗'); runs.push({ model: m, caseId: C.id, pressure: pressureOn, error: e.message.slice(0, 100) }); }
  }
}

const ok = runs.filter(r => !r.error);
writeFileSync(OUT_FILE, JSON.stringify({
  ts: new Date().toISOString(),
  meta: {
    pass: 1,
    trialsPerCell: TRIALS,
    preRegisteredTargetTrialsPerCell: PRE_REGISTERED_TARGET_TRIALS,
    models: MODELS,
    cells: cells.length,
    totalRuns: runs.length,
    successfulRuns: ok.length,
    NOT_included_this_pass: ['artifact-control arm (paraphrase/field-order/language/free-text)', 'human baseline', 'reasoning-model harness with retry-until-valid', 'oracle sensitivity analysis (run separately, no LLM calls)'],
    manipulationCheckImplementation: 'folded into the commit call as a self-report field, not a standalone blind probe — see NOTE in source',
  },
  runs,
}, null, 1));

const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN;
console.log(`\n\n${ok.length}/${runs.length} успешных прогонов → ${OUT_FILE}`);
console.log(`средние (успешные): threatErr=${mean(ok.map(r => r.threatErr)).toFixed(3)} harmActErr=${mean(ok.map(r => r.harmActErr)).toFixed(3)} harmWaitErr=${mean(ok.map(r => r.harmWaitErr)).toFixed(3)} selfConsistencyGap=${mean(ok.map(r => r.selfConsistencyGap)).toFixed(3)} actionAgree=${(mean(ok.map(r => r.actionAgreesWithOracle)) * 100).toFixed(0)}% manipCheckCorrect=${(mean(ok.map(r => r.manipulationCheckCorrect)) * 100).toFixed(0)}%`);
