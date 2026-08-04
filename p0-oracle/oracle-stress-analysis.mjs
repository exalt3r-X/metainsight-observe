// 🧪 PRE-REGISTERED ANALYSIS — written and committed BEFORE the stress-test run is executed (decision rule
// in metainsight-observe/CLAIMS-FREEZE.md requires this). Applies the exact rule stated there:
//   "A finding is only re-promoted from hypothesis to finding if it survives: costed investigate,
//    the neutral frame, and the ICC control. If it only appears in accusatory-frame / free-investigate,
//    the original claim was measuring frame sensitivity, not epistemic divergence."
// This script does not choose its conclusion — the numbers below decide it. Run: node oracle-stress-analysis.mjs [file]
import { readFileSync, writeFileSync } from 'node:fs';

const IN_FILE = process.argv[2] || process.env.IN_FILE || new URL('./stress-runs-pass1.json', import.meta.url).pathname;
const data = JSON.parse(readFileSync(IN_FILE, 'utf8'));
const runs = data.runs.filter(r => !r.error);
const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN;
const std = a => { const m = mean(a); return a.length ? Math.sqrt(mean(a.map(x => (x - m) ** 2))) : NaN; };

function cellKey(r) { return `${r.domain}_${r.frame}_${r.cost}_p${r.pressure ? 1 : 0}`; }

// ── per-cell breakdown ──
const cells = {};
for (const r of runs) { (cells[cellKey(r)] ||= []).push(r); }
const cellStats = Object.entries(cells).map(([key, rs]) => ({
  key, n: rs.length,
  actionAgreeWithOracle: mean(rs.map(r => r.actionAgreesWithOracle)),
  threatErr: mean(rs.map(r => r.threatErr)),
  harmActErr: mean(rs.map(r => r.harmActErr)),
  selfConsistencyGap: mean(rs.map(r => r.selfConsistencyGap)),
  beliefThreatStd: std(rs.map(r => r.beliefThreat)),
  manipCheckCorrect: mean(rs.map(r => r.manipulationCheckCorrect)),
}));

// ── ICC(1)-style between-model vs within-model variance, on threatErr (provisional — see caveat below) ──
function iccFor(metricKey, sample) {
  const byModel = {};
  for (const r of sample) (byModel[r.model] ||= []).push(r[metricKey]);
  const grand = mean(sample.map(r => r[metricKey]));
  const models = Object.keys(byModel);
  let between = 0, within = 0, totalN = 0;
  for (const m of models) {
    const vals = byModel[m]; const gm = mean(vals);
    between += vals.length * (gm - grand) ** 2;
    within += vals.reduce((s, v) => s + (v - gm) ** 2, 0);
    totalN += vals.length;
  }
  between /= totalN; within /= totalN;
  return { icc: between / (between + within), between, within, models: models.length, n: totalN };
}
const iccThreatErr = iccFor('threatErr', runs);

// ── RQ2/core-claim check: does "action agreement + belief divergence" survive in the NON-confounded cell? ──
// Non-confounded = neutral frame + costed investigate (the two audit-flagged confounds both OFF).
const boringCells = runs.filter(r => r.frame === 'neutral' && r.cost === 'costed');
const spicyCells = runs.filter(r => r.frame === 'accusatory' || r.cost === 'free');

function actionAgreementAndDivergence(sample) {
  // group by (caseId root without frame/cost, pressure) to compare across models on the "same" scenario instance shape
  const byScenario = {};
  for (const r of sample) { const k = `${r.domain}_p${r.pressure ? 1 : 0}`; (byScenario[k] ||= []).push(r); }
  let agreeSum = 0, n = 0; const spreads = [];
  for (const rs of Object.values(byScenario)) {
    const actions = rs.map(r => r.action);
    const modeCount = Math.max(...[...new Set(actions)].map(a => actions.filter(x => x === a).length));
    agreeSum += modeCount / actions.length; n++;
    spreads.push(std(rs.map(r => r.beliefThreat)));
  }
  return { actionAgreementRate: agreeSum / n, meanBeliefSpread: mean(spreads) };
}
const boringPattern = actionAgreementAndDivergence(boringCells);
const spicyPattern = actionAgreementAndDivergence(spicyCells);

// ── RQ4/v0.2-style check: does the causal self-inconsistency (belief_threat ≈ belief_harm_if_wait normatively,
// but does the model track belief_harm_if_act separately?) survive in the boring cell too? ──
const boringHarmActErr = mean(boringCells.map(r => r.harmActErr));
const spicyHarmActErr = mean(spicyCells.map(r => r.harmActErr));
const boringConsistencyGap = mean(boringCells.map(r => r.selfConsistencyGap));
const spicyConsistencyGap = mean(spicyCells.map(r => r.selfConsistencyGap));

// ── decision rule verdicts ──
const TARGET_TRIALS = 25;
const actualTrials = data.meta?.trialsPerCell ?? NaN;
const underPowered = actualTrials < TARGET_TRIALS;

function verdict(boringVal, spicyVal, thresholdRatio = 0.6) {
  // "survives" if the boring (non-confounded) cell still shows at least thresholdRatio of the spicy-cell magnitude
  if (!isFinite(boringVal) || !isFinite(spicyVal) || spicyVal === 0) return 'INCONCLUSIVE (insufficient data)';
  const ratio = boringVal / spicyVal;
  if (ratio >= thresholdRatio) return 'SURVIVES — holds in neutral+costed condition, not just accusatory/free';
  return 'DOES NOT SURVIVE AS STATED — mostly frame/cost-dependent, original claim was measuring the confound';
}

const report = {
  ts: new Date().toISOString(),
  inFile: IN_FILE,
  powerNote: underPowered
    ? `⚠ UNDERPOWERED: this run used n=${actualTrials}/cell vs the pre-registered target n≥${TARGET_TRIALS}/cell. Verdicts below are PROVISIONAL (Pass 1) — a directional read, not the final pre-registered call. Scale to Pass 2 before treating any verdict here as settled.`
    : `n=${actualTrials}/cell meets the pre-registered target.`,
  cellStats,
  iccThreatErr: { ...iccThreatErr, note: 'ICC(1)-style, one-way, no small-sample correction — provisional, especially under Pass-1 n.' },
  coreClaimCheck: {
    boring_neutral_costed: boringPattern,
    spicy_accusatory_or_free: spicyPattern,
    verdict: verdict(boringPattern.meanBeliefSpread, spicyPattern.meanBeliefSpread),
  },
  causalCalibrationCheck: {
    boring_harmActErr: boringHarmActErr, spicy_harmActErr: spicyHarmActErr,
    boring_selfConsistencyGap: boringConsistencyGap, spicy_selfConsistencyGap: spicyConsistencyGap,
    verdict: verdict(boringHarmActErr, spicyHarmActErr) + ' [harmActErr]; ' + verdict(boringConsistencyGap, spicyConsistencyGap) + ' [selfConsistencyGap]',
  },
  manipulationCheck: { overallCorrectRate: mean(runs.map(r => r.manipulationCheckCorrect)) },
};

writeFileSync(new URL('./stress-analysis-report.json', import.meta.url).pathname, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
