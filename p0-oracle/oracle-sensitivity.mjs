// 🧪 ORACLE SENSITIVITY ANALYSIS — audit point 7 (CLAIMS-FREEZE.md): "the oracle is normative relative
// to the priors/likelihoods/payoffs WE authored... if small parameter changes flip the ranking, the
// oracle's normativity claim is too fragile to hang findings on." Pure math, no LLM calls, deterministic.
//
// Method: find the exact posterior probability p=P(real_threat) at which the optimal action switches
// (e.g. wait → investigate → act), for the baseline PILOT parameters. Then perturb payoffs and
// likelihoods within a plausible ±30% range and re-find the switch points. Report how far they move.
// A small shift = the oracle's action-boundary is robust to our specific parameter choices.
// A large shift = findings that depend on "was action X optimal here" are fragile to those choices.
import { PILOT } from './oracle-pilot-case.mjs';
import { expectedUtility, optimalAction, voi } from './oracle-engine.mjs';

function findSwitchPoints(caseDef, steps = 2001) {
  let prevAction = null; const switches = [];
  for (let i = 0; i <= steps; i++) {
    const p = i / steps;
    const post = { real_threat: p, false_alarm: 1 - p };
    const action = optimalAction(caseDef, post);
    if (prevAction && action !== prevAction) switches.push({ p: +p.toFixed(4), from: prevAction, to: action });
    prevAction = action;
  }
  return switches;
}

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

function scalePayoff(caseDef, actionKey, factor) {
  const C = clone(caseDef);
  for (const h of Object.keys(C.actions[actionKey].payoff)) {
    C.actions[actionKey].payoff[h] = +(C.actions[actionKey].payoff[h] * factor).toFixed(2);
  }
  return C;
}

function scaleLikelihoodGap(caseDef, sourceKey, factor) {
  // widen/narrow the gap between real_threat and false_alarm likelihood for one source, centered on their midpoint
  const C = clone(caseDef);
  const s = C.sources[sourceKey];
  const mid = (s.likelihood.real_threat + s.likelihood.false_alarm) / 2;
  s.likelihood.real_threat = Math.min(0.99, Math.max(0.01, mid + (s.likelihood.real_threat - mid) * factor));
  s.likelihood.false_alarm = Math.min(0.99, Math.max(0.01, mid + (s.likelihood.false_alarm - mid) * factor));
  return C;
}

const baseline = findSwitchPoints(PILOT);
console.log('BASELINE (unperturbed PILOT) action-switch points as P(real_threat) rises:');
baseline.forEach(s => console.log(`  p=${s.p}: ${s.from} → ${s.to}`));

const perturbations = [];
for (const factor of [0.7, 0.85, 1.15, 1.3]) {
  perturbations.push({ label: `act.payoff × ${factor}`, case: scalePayoff(PILOT, 'act', factor) });
  perturbations.push({ label: `wait.payoff × ${factor}`, case: scalePayoff(PILOT, 'wait', factor) });
  perturbations.push({ label: `investigate.payoff × ${factor}`, case: scalePayoff(PILOT, 'investigate', factor) });
  perturbations.push({ label: `vent (diagnostic key) likelihood-gap × ${factor}`, case: scaleLikelihoodGap(PILOT, 'vent', factor) });
  perturbations.push({ label: `terminal (weak signal) likelihood-gap × ${factor}`, case: scaleLikelihoodGap(PILOT, 'terminal', factor) });
}

console.log(`\n${perturbations.length} perturbations (±15%/±30% on each payoff and on the two independent sources' likelihood-gaps):\n`);

let maxShift = 0, maxShiftLabel = '';
const rows = [];
for (const { label, case: C } of perturbations) {
  const sw = findSwitchPoints(C);
  // compare each baseline switch to the nearest same-transition switch in the perturbed case
  let worstShift = 0;
  for (const b of baseline) {
    const match = sw.find(s => s.from === b.from && s.to === b.to);
    const shift = match ? Math.abs(match.p - b.p) : NaN;
    if (isFinite(shift)) worstShift = Math.max(worstShift, shift);
  }
  rows.push({ label, switchPoints: sw.map(s => `${s.from}→${s.to}@${s.p}`).join(', ') || '(no switch — one action dominates entire range)', worstShift: +worstShift.toFixed(4) });
  if (worstShift > maxShift) { maxShift = worstShift; maxShiftLabel = label; }
}

rows.forEach(r => console.log(`${r.label.padEnd(42)} shift=${isFinite(r.worstShift) ? r.worstShift : 'N/A'}  [${r.switchPoints}]`));

// VOI structural ranking check (diag should always beat crowd — used to justify case design/teaser wording)
console.log('\nVOI(diag) > VOI(crowd) at prior, across the same perturbation set:');
let voiRankingBreaks = 0;
for (const { label, case: C } of perturbations) {
  const [weakKey, diagKey, echoKey, crowdKey] = Object.keys(C.sources);
  const vDiag = voi(C, C.prior, [], diagKey), vCrowd = voi(C, C.prior, [], crowdKey);
  const holds = vDiag > vCrowd;
  if (!holds) { voiRankingBreaks++; console.log(`  ✗ BREAKS under "${label}": VOI(diag)=${vDiag.toFixed(3)} vs VOI(crowd)=${vCrowd.toFixed(3)}`); }
}
console.log(voiRankingBreaks === 0 ? '  ✓ holds across all perturbations' : `  ${voiRankingBreaks}/${perturbations.length} perturbations break this ranking`);

const STABLE_THRESHOLD = 0.05; // 5 probability points — arbitrary but stated up front, not picked after seeing results
console.log(`\n── VERDICT (stability bar: max switch-point shift < ${STABLE_THRESHOLD} under ±15-30% single-parameter perturbation) ──`);
console.log(`Largest observed shift: ${maxShift.toFixed(4)} (${maxShiftLabel})`);
console.log(maxShift < STABLE_THRESHOLD
  ? 'STABLE: the action-optimality boundaries used to design/score the stress-test cases do not flip under plausible single-parameter perturbation.'
  : 'FRAGILE: at least one plausible parameter choice shifts the action boundary by more than the stability bar — findings that hinge on a specific "action X was optimal here" call should be read with that in mind.');
