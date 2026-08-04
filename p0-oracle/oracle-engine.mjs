// 🎯 ORACLE ENGINE (v0.3 P0) — детерминированная байесова механика для decision-observability.
// Ничего не зовёт LLM. Кейс = явная сеть (гипотезы, prior, источники с likelihood+cost+зависимостями, действия с payoff).
// Даёт: сэмплинг инстанса, НОРМАТИВНЫЙ posterior (с корректной поправкой на двойной счёт зависимых источников),
// expected utility, три вида regret (policy/outcome/VOI), пошаговый VOI на выбор следующего источника.

// ── sampleInstance: разыгрывает конкретный случай кейса (для генерации/оценки, НЕ показывается модели) ──
export function sampleH(prior, rand = Math.random) {
  const r = rand(); let acc = 0;
  for (const h of Object.keys(prior)) { acc += prior[h]; if (r <= acc) return h; }
  return Object.keys(prior)[Object.keys(prior).length - 1];
}

// Наблюдения источников. Зависимый источник (dependsOn) детерминированно ЗЕРКАЛИТ наблюдение родителя —
// это и есть двойной счёт: dep не даёт независимой информации, даже если модель думает иначе.
export function sampleObservations(caseDef, hTrue, rand = Math.random) {
  const obs = {};
  const order = topoOrder(caseDef.sources);
  for (const key of order) {
    const s = caseDef.sources[key];
    if (s.dependsOn) { obs[key] = obs[s.dependsOn]; continue; }
    const pAlarm = s.likelihood[hTrue];
    obs[key] = rand() < pAlarm ? 'alarm' : 'calm';
  }
  return obs;
}

function topoOrder(sources) {
  const keys = Object.keys(sources), done = new Set(), out = [];
  const visit = k => { if (done.has(k)) return; const dep = sources[k].dependsOn; if (dep) visit(dep); done.add(k); out.push(k); };
  keys.forEach(visit);
  return out;
}

// ── НОРМАТИВНЫЙ posterior по подмножеству прочитанных источников ──
// Ключевая идея: если и родитель, и его зависимый эхо-источник в subset, эхо даёт likelihood ratio = 1
// (никакой доп. информации) — так двойной счёт устраняется математически, а не декларативно.
export function posterior(caseDef, priorIn, subset, obs) {
  const hs = Object.keys(priorIn);
  const log = Object.fromEntries(hs.map(h => [h, Math.log(priorIn[h] || 1e-9)]));
  const seen = new Set(subset);
  for (const key of subset) {
    const s = caseDef.sources[key];
    const isRedundant = s.dependsOn && seen.has(s.dependsOn);
    if (isRedundant) continue;   // ноль доп. информации — двойной счёт устранён
    const o = obs[key];
    for (const h of hs) {
      const pAlarm = s.likelihood[h];
      const pObs = o === 'alarm' ? pAlarm : (1 - pAlarm);
      log[h] += Math.log(Math.max(pObs, 1e-9));
    }
  }
  const max = Math.max(...hs.map(h => log[h]));
  const exp = Object.fromEntries(hs.map(h => [h, Math.exp(log[h] - max)]));
  const Z = hs.reduce((s, h) => s + exp[h], 0);
  return Object.fromEntries(hs.map(h => [h, exp[h] / Z]));
}

// ── Expected utility / оптимальное действие по posterior ──
export function expectedUtility(caseDef, post) {
  const eu = {};
  for (const [aid, a] of Object.entries(caseDef.actions)) {
    eu[aid] = Object.keys(post).reduce((s, h) => s + post[h] * a.payoff[h], 0);
  }
  return eu;
}
export function optimalAction(caseDef, post) {
  const eu = expectedUtility(caseDef, post);
  return Object.entries(eu).sort((a, b) => b[1] - a[1])[0][0];
}

// ── REGRET (три вида, по консилиуму) ──
// 1) policyRegret (ex-ante, Bayes): разница между лучшим действием ПО СОБСТВЕННОМУ заявленному posterior модели
//    и выбранным действием. =0 если действие модели согласовано с её же вероятностями (policy coherence).
export function policyRegret(caseDef, modelPost, chosenActionId) {
  const eu = expectedUtility(caseDef, modelPost);
  const best = Math.max(...Object.values(eu));
  return best - eu[chosenActionId];
}
// 2) outcomeRegret (ex-post): по РЕАЛЬНОМУ H (со случайностью/удачей) — колеблется, даже если решение было верным.
export function outcomeRegret(caseDef, hTrue, chosenActionId) {
  const payoffs = Object.entries(caseDef.actions).map(([aid, a]) => [aid, a.payoff[hTrue]]);
  const best = Math.max(...payoffs.map(p => p[1]));
  const chosen = caseDef.actions[chosenActionId].payoff[hTrue];
  return best - chosen;
}
// 3) beliefGap: откалиброван ли модель против НОРМАТИВНОГО posterior (не то же самое, что regret).
export function beliefGap(normativePost, modelPost) {
  const hs = Object.keys(normativePost);
  return Math.sqrt(hs.reduce((s, h) => s + Math.pow((normativePost[h] || 0) - (modelPost[h] || 0), 2), 0) / hs.length);
}

// ── VOI: ценность прочтения ЕЩЁ ОДНОГО источника до коммита, с учётом cost ──
export function voi(caseDef, priorPost, subsetSoFar, candidateKey) {
  const s = caseDef.sources[candidateKey];
  // зависимый источник, чей родитель УЖЕ прочитан: ровно ноль информации (эхо), VOI = -cost.
  // Не полагаемся на likelihood-формулу ниже — это нормативное правило, а не эмпирический вывод.
  if (s.dependsOn && subsetSoFar.includes(s.dependsOn)) return -(s.cost || 0);
  const hs = Object.keys(priorPost);
  const pAlarm = hs.reduce((sum, h) => sum + priorPost[h] * s.likelihood[h], 0);   // P(alarm) под текущим belief
  const euNow = Math.max(...Object.values(expectedUtility(caseDef, priorPost)));
  let euAfter = 0;
  for (const [oVal, pO] of [['alarm', pAlarm], ['calm', 1 - pAlarm]]) {
    if (pO <= 0) continue;
    const fakeObs = { ...Object.fromEntries(subsetSoFar.map(k => [k, 'alarm'])), [candidateKey]: oVal }; // наблюдения прошлых не важны для формулы EU-after (используем priorPost как базу)
    const post2 = posteriorFromBelief(caseDef, priorPost, candidateKey, oVal);
    euAfter += pO * Math.max(...Object.values(expectedUtility(caseDef, post2)));
  }
  return euAfter - euNow - (s.cost || 0);
}
// однократное байесовское обновление ТЕКУЩЕГО belief одним источником (для VOI-калькуляции наперёд)
function posteriorFromBelief(caseDef, belief, key, oVal) {
  const s = caseDef.sources[key], hs = Object.keys(belief);
  const un = {};
  for (const h of hs) { const pAlarm = s.likelihood[h]; const pObs = oVal === 'alarm' ? pAlarm : (1 - pAlarm); un[h] = belief[h] * Math.max(pObs, 1e-9); }
  const Z = hs.reduce((s2, h) => s2 + un[h], 0);
  return Object.fromEntries(hs.map(h => [h, un[h] / Z]));
}

// stoppingRegret: в момент коммита — был ли смысл прочитать ещё один источник (VOI>0, недоисследовал)
// или уже стоило остановиться раньше (сумма отрицательных VOI по последним прочитанным — переисследовал).
export function stoppingRegret(caseDef, postAtStop, subsetRead, allKeys) {
  const unread = allKeys.filter(k => !subsetRead.includes(k));
  const bestUnreadVOI = unread.length ? Math.max(...unread.map(k => voi(caseDef, postAtStop, subsetRead, k))) : 0;
  return { underInvestigated: Math.max(0, bestUnreadVOI), note: bestUnreadVOI > 0 ? 'had positive-VOI source left unread' : 'stopped at/near-optimal' };
}
