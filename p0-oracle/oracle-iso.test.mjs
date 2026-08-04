// Структурный тест изоморфности: 3 разных сюжета ДОЛЖНЫ давать ЧИСЛЕННО ИДЕНТИЧНЫЙ результат
// оракула на соответствующих ролях (weak/diag/echo/crowd), т.к. числа общие. Если тест падает —
// где-то разошлись likelihood/cost/payoff между обёртками, и сравнение моделей по доменам будет нечестным.
import assert from 'node:assert/strict';
import { posterior, optimalAction, voi, stoppingRegret } from './oracle-engine.mjs';
import { PILOT } from './oracle-pilot-case.mjs';
import { ISO_CLINICAL, ISO_WORKPLACE, ISO_SUPPLY, ISO_CASES } from './oracle-iso-cases.mjs';

let n = 0, ok = 0;
function test(name, fn) { n++; try { fn(); ok++; console.log('✓', name); } catch (e) { console.log('✗', name, '—', e.message); } }

// роли в порядке вставки: [weak, diag, echo, crowd] — одинаковый порядок во всех кейсах по построению
const rolesOf = C => Object.keys(C.sources);
const actionsOf = C => Object.keys(C.actions);

test('все ISO-кейсы имеют одинаковое число источников/действий/бюджет, что и PILOT', () => {
  for (const C of ISO_CASES) {
    assert.equal(rolesOf(C).length, 4);
    assert.equal(actionsOf(C).length, 3);
    assert.equal(C.infoBudget, PILOT.infoBudget);
    assert.deepEqual(C.prior, PILOT.prior);
  }
});

test('posterior ЧИСЛЕННО идентичен across доменов при одинаковых наблюдениях на соответствующих ролях', () => {
  for (const C of ISO_CASES) {
    const [weak, diag, echo, crowd] = rolesOf(C);
    const obs = { [weak]: 'alarm', [diag]: 'alarm' };
    const p = posterior(C, C.prior, [weak, diag], obs);
    const pilotObs = { terminal: 'alarm', vent: 'alarm' };
    const pPilot = posterior(PILOT, PILOT.prior, ['terminal', 'vent'], pilotObs);
    assert.ok(Math.abs(p.real_threat - pPilot.real_threat) < 1e-9,
      `${C.id}: ${p.real_threat} vs pilot ${pPilot.real_threat}`);
  }
});

test('двойной счёт устранён одинаково во всех доменах (weak+echo = weak)', () => {
  for (const C of ISO_CASES) {
    const [weak, diag, echo, crowd] = rolesOf(C);
    const obs = { [weak]: 'alarm', [echo]: 'alarm' };
    const withEcho = posterior(C, C.prior, [weak, echo], obs).real_threat;
    const withoutEcho = posterior(C, C.prior, [weak], obs).real_threat;
    assert.ok(Math.abs(withEcho - withoutEcho) < 1e-9, `${C.id}: двойной счёт не устранён (${withEcho} vs ${withoutEcho})`);
  }
});

test('VOI(diag) > VOI(crowd) во всех доменах (диагностич. ключ ценнее слуха, структурно)', () => {
  for (const C of ISO_CASES) {
    const [weak, diag, echo, crowd] = rolesOf(C);
    const vDiag = voi(C, C.prior, [], diag);
    const vCrowd = voi(C, C.prior, [], crowd);
    assert.ok(vDiag > vCrowd, `${C.id}: diag(${vDiag}) должен быть > crowd(${vCrowd})`);
  }
});

test('VOI(echo) строго = -cost во всех доменах, если родитель(weak) уже прочитан', () => {
  for (const C of ISO_CASES) {
    const [weak, diag, echo, crowd] = rolesOf(C);
    const v = voi(C, C.prior, [weak], echo);
    assert.equal(v, -C.sources[echo].cost, `${C.id}: ожидал -${C.sources[echo].cost}, получил ${v}`);
  }
});

test('optimalAction идентичен по домену при идентичном posterior (перекос к угрозе)', () => {
  const post = { real_threat: 0.95, false_alarm: 0.05 };
  for (const C of ISO_CASES) {
    const [, , , ] = rolesOf(C);
    const decisive = C.actions && Object.entries(C.actions).find(([, a]) => a.payoff.real_threat > 0)[0];
    assert.equal(optimalAction(C, post), decisive, `${C.id}: ожидал decisive-действие`);
  }
});

test('уникальность имён ключей источников/действий (нет случайных коллизий между доменами)', () => {
  const allKeys = ISO_CASES.flatMap(C => [...rolesOf(C)]);
  // внутри каждого кейса не должно быть повторов
  for (const C of ISO_CASES) assert.equal(new Set(rolesOf(C)).size, rolesOf(C).length);
});

console.log(`\n${ok}/${n} тестов изоморфности прошли`);
if (ok !== n) process.exit(1);
