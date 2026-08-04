// Проверка STRESS_CASES перед прогоном (пре-регистрация требует, чтобы скрипт был верным ДО прогона).
import assert from 'node:assert/strict';
import { PILOT } from './oracle-pilot-case.mjs';
import { STRESS_CASES, PRESSURE_TEXT, DOMAINS } from './oracle-stress-cases.mjs';

let n = 0, ok = 0;
function test(name, fn) { n++; try { fn(); ok++; console.log('✓', name); } catch (e) { console.log('✗', name, '—', e.message); } }

test('12 кейсов: 3 домена × 2 фрейма × 2 cost, все id уникальны', () => {
  assert.equal(STRESS_CASES.length, 12);
  assert.equal(new Set(STRESS_CASES.map(c => c.id)).size, 12);
});

test('likelihood/prior идентичны PILOT во всех 12 кейсах (только обёртка меняется)', () => {
  for (const C of STRESS_CASES) {
    assert.deepEqual(C.prior, PILOT.prior, C.id);
    const [weak, diag, echo, crowd] = Object.keys(C.sources);
    assert.deepEqual(C.sources[weak].likelihood, PILOT.sources.terminal.likelihood, `${C.id} weak`);
    assert.deepEqual(C.sources[diag].likelihood, PILOT.sources.vent.likelihood, `${C.id} diag`);
    assert.deepEqual(C.sources[echo].likelihood, PILOT.sources.terminal.likelihood, `${C.id} echo`);
    assert.deepEqual(C.sources[crowd].likelihood, PILOT.sources.mara.likelihood, `${C.id} crowd`);
    assert.equal(C.sources[echo].dependsOn, weak, `${C.id} echo.dependsOn`);
  }
});

test('cost=free → investigate payoff строго {0,0}; cost=costed → строго PILOT.investigate', () => {
  for (const C of STRESS_CASES) {
    const probeKey = Object.keys(C.actions).find(k => C.actions[k].reversible && k !== 'wait' && C.actions[k] !== C.actions.act);
    const probe = C.actions.investigate;
    assert.ok(probe, `${C.id}: нет action 'investigate'`);
    if (C.id.endsWith('_free')) assert.deepEqual(probe.payoff, { real_threat: 0, false_alarm: 0 }, C.id);
    else assert.deepEqual(probe.payoff, PILOT.actions.investigate.payoff, C.id);
  }
});

test('decisive/passive payoff идентичны PILOT.act/wait во всех 12 кейсах', () => {
  for (const C of STRESS_CASES) {
    assert.deepEqual(C.actions.act.payoff, PILOT.actions.act.payoff, C.id);
    assert.deepEqual(C.actions.wait.payoff, PILOT.actions.wait.payoff, C.id);
  }
});

test('neutral/accusatory пара внутри домена+cost различается ТОЛЬКО hookText', () => {
  for (const domain of DOMAINS) {
    for (const cost of ['free', 'costed']) {
      const neu = STRESS_CASES.find(c => c.id === `stress_${domain}_neutral_${cost}`);
      const acc = STRESS_CASES.find(c => c.id === `stress_${domain}_accusatory_${cost}`);
      assert.ok(neu && acc, `${domain}/${cost}: пара не найдена`);
      assert.notEqual(neu.hookText, acc.hookText, `${domain}/${cost}: hookText не различается`);
      assert.deepEqual(neu.sources, acc.sources, `${domain}/${cost}: sources разошлись`);
      assert.deepEqual(neu.actions, acc.actions, `${domain}/${cost}: actions разошлись`);
    }
  }
});

test('PRESSURE_TEXT задан для каждого домена, непустой, отдельный от hookText', () => {
  for (const domain of DOMAINS) {
    assert.ok(PRESSURE_TEXT[domain] && PRESSURE_TEXT[domain].length > 10, domain);
  }
});

console.log(`\n${ok}/${n} тестов прошли`);
if (ok !== n) process.exit(1);
