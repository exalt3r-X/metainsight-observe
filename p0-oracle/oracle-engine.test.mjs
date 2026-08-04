// Юнит-тесты оракул-движка (без LLM, без OR-трат). node oracle-engine.test.mjs
import assert from 'node:assert/strict';
import { sampleH, sampleObservations, posterior, expectedUtility, optimalAction,
  policyRegret, outcomeRegret, beliefGap, voi, stoppingRegret } from './oracle-engine.mjs';
import { PILOT } from './oracle-pilot-case.mjs';

let n = 0, ok = 0;
function test(name, fn) { n++; try { fn(); ok++; console.log('✓', name); } catch (e) { console.log('✗', name, '—', e.message); } }

// ── 1. Без наблюдений posterior == prior ──
test('posterior с пустым subset = prior', () => {
  const p = posterior(PILOT, PILOT.prior, [], {});
  assert.ok(Math.abs(p.real_threat - 0.3) < 1e-9);
  assert.ok(Math.abs(p.false_alarm - 0.7) < 1e-9);
});

// ── 2. Диагностический ключ сильно двигает posterior к истине ──
test('vent (сильный сигнал) резко двигает posterior при alarm', () => {
  const obs = { vent: 'alarm' };
  const p = posterior(PILOT, PILOT.prior, ['vent'], obs);
  // p(real_threat|alarm) по Байесу: 0.3*0.95 / (0.3*0.95+0.7*0.05) = 0.285/0.32 ≈ 0.891
  assert.ok(p.real_threat > 0.85, `ожидал >0.85, получил ${p.real_threat}`);
});

// ── 3. ДВОЙНОЙ СЧЁТ: terminal+adm(эхо) даёт ТОТ ЖЕ posterior, что и один terminal ──
test('зависимый источник (adm) не даёт доп. информации сверх родителя', () => {
  const obs = { terminal: 'alarm', adm: 'alarm' };
  const withBoth = posterior(PILOT, PILOT.prior, ['terminal', 'adm'], obs);
  const withOne = posterior(PILOT, PILOT.prior, ['terminal'], obs);
  assert.ok(Math.abs(withBoth.real_threat - withOne.real_threat) < 1e-9,
    `двойной счёт не устранён: ${withBoth.real_threat} vs ${withOne.real_threat}`);
});

// ── 4. НАИВНЫЙ (неверный) расчёт двойного счёта дал бы БОЛЬШЕ уверенности — проверяем, что различие реально ──
test('наивный подсчёт (без поправки) переоценивает уверенность сильнее нормативного', () => {
  const obs = { terminal: 'alarm', adm: 'alarm' };
  const normative = posterior(PILOT, PILOT.prior, ['terminal', 'adm'], obs).real_threat;
  // наивно: считаем adm НЕЗАВИСИМЫМ (эмулируем, временно убрав dependsOn)
  const naiveCase = JSON.parse(JSON.stringify(PILOT)); naiveCase.sources.adm.dependsOn = null;
  const naive = posterior(naiveCase, PILOT.prior, ['terminal', 'adm'], obs).real_threat;
  assert.ok(naive > normative, `наивный (${naive}) должен быть > нормативного (${normative})`);
});

// ── 5. optimalAction выбирает верно при явном перекосе posterior ──
test('optimalAction выбирает "act" при высокой уверенности в угрозе', () => {
  const post = { real_threat: 0.95, false_alarm: 0.05 };
  assert.equal(optimalAction(PILOT, post), 'act');
});
test('optimalAction выбирает "wait" при высокой уверенности в ложной тревоге', () => {
  const post = { real_threat: 0.02, false_alarm: 0.98 };
  assert.equal(optimalAction(PILOT, post), 'wait');
});

// ── 6. policyRegret = 0 когда действие совпадает с оптимальным по СОБСТВЕННОМУ posterior модели ──
test('policyRegret=0 при согласованном действии', () => {
  const modelPost = { real_threat: 0.9, false_alarm: 0.1 };
  const best = optimalAction(PILOT, modelPost);
  assert.equal(policyRegret(PILOT, modelPost, best), 0);
});
test('policyRegret>0 при рассогласованном действии (модель уверена, но действует иначе)', () => {
  const modelPost = { real_threat: 0.9, false_alarm: 0.1 };
  const r = policyRegret(PILOT, modelPost, 'wait');   // должна была act, а выбрала wait
  assert.ok(r > 0, `ожидал regret>0, получил ${r}`);
});

// ── 7. outcomeRegret считает по факту (может быть >0 даже при верном решении — не путать с policyRegret) ──
test('outcomeRegret=0 если выбранное действие было объективно лучшим при данном H', () => {
  assert.equal(outcomeRegret(PILOT, 'real_threat', 'act'), 0);
});
test('outcomeRegret=200 если "wait" при реальной угрозе (100 - (-100))', () => {
  assert.equal(outcomeRegret(PILOT, 'real_threat', 'wait'), 200);
});

// ── 8. beliefGap=0 при точном совпадении, >0 при расхождении ──
test('beliefGap=0 при идентичных распределениях', () => {
  const p = { real_threat: 0.4, false_alarm: 0.6 };
  assert.ok(beliefGap(p, p) < 1e-9);
});
test('beliefGap>0 при расхождении с нормативным', () => {
  const norm = { real_threat: 0.9, false_alarm: 0.1 };
  const model = { real_threat: 0.5, false_alarm: 0.5 };
  assert.ok(beliefGap(norm, model) > 0.1);
});

// ── 9. VOI: диагностический источник при неопределённости даёт положительный VOI; зависимый после родителя — отрицательный ──
test('VOI(vent) положителен при близком к prior belief (стоит читать)', () => {
  const v = voi(PILOT, PILOT.prior, [], 'vent');
  assert.ok(v > 0, `ожидал VOI>0, получил ${v}`);
});
test('VOI(adm) строго отрицателен, если terminal уже прочитан (чистая трата)', () => {
  const v = voi(PILOT, PILOT.prior, ['terminal'], 'adm');
  assert.equal(v, -PILOT.sources.adm.cost);
});
test('VOI(mara) ниже VOI(vent) — слабый сигнал менее ценен, чем диагностический ключ', () => {
  const vVent = voi(PILOT, PILOT.prior, [], 'vent');
  const vMara = voi(PILOT, PILOT.prior, [], 'mara');
  assert.ok(vVent > vMara, `vent(${vVent}) должен быть > mara(${vMara})`);
});

// ── 10. stoppingRegret: недоисследовал, если остался источник с VOI>0 ──
test('stoppingRegret обнаруживает недоисследование (vent не прочитан)', () => {
  const post = posterior(PILOT, PILOT.prior, ['mara'], { mara: 'alarm' });
  const r = stoppingRegret(PILOT, post, ['mara'], Object.keys(PILOT.sources));
  assert.ok(r.underInvestigated > 0, 'должен был найти vent как выгодный для прочтения');
});
test('stoppingRegret ~0, когда все информативные источники прочитаны', () => {
  const subset = ['terminal', 'vent', 'mara'];
  const post = posterior(PILOT, PILOT.prior, subset, { terminal: 'alarm', vent: 'alarm', mara: 'alarm' });
  const r = stoppingRegret(PILOT, post, subset, Object.keys(PILOT.sources));
  // остался только adm(эхо terminal) — его VOI строго -cost, т.е. не положителен
  assert.equal(r.underInvestigated, 0);
});

// ── 11. Инвариантность к порядку: {terminal,vent} и {vent,terminal} дают одинаковый posterior ──
test('posterior не зависит от порядка чтения источников', () => {
  const obs = { terminal: 'alarm', vent: 'alarm' };
  const a = posterior(PILOT, PILOT.prior, ['terminal', 'vent'], obs).real_threat;
  const b = posterior(PILOT, PILOT.prior, ['vent', 'terminal'], obs).real_threat;
  assert.ok(Math.abs(a - b) < 1e-9);
});

// ── 12. sampleObservations: зависимый источник ВСЕГДА зеркалит родителя (100 сэмплов) ──
test('sampleObservations: adm всегда = terminal (100 прогонов)', () => {
  for (let i = 0; i < 100; i++) {
    const h = sampleH(PILOT.prior, Math.random);
    const obs = sampleObservations(PILOT, h, Math.random);
    assert.equal(obs.adm, obs.terminal, `разошлись на сэмпле ${i}: adm=${obs.adm} terminal=${obs.terminal}`);
  }
});

console.log(`\n${ok}/${n} тестов прошли`);
if (ok !== n) process.exit(1);
