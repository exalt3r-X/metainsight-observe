# Stress test — Pass 1 results (2026-08-05)

Pre-registered at commit [`0503eba`](https://github.com/exalt3r-X/metainsight-observe/commit/0503eba) (durability fix at [`dc8eb7b`](https://github.com/exalt3r-X/metainsight-observe/commit/dc8eb7b) — touches persistence only, not scoring). Design and decision rule: [`../CLAIMS-FREEZE.md`](../CLAIMS-FREEZE.md). Raw data: [`../results/stress-pass1-2026-08-05.json`](../results/stress-pass1-2026-08-05.json) (359/360 successful runs) and the mechanical analysis output at [`../results/stress-pass1-analysis-2026-08-05.json`](../results/stress-pass1-analysis-2026-08-05.json).

**This is Pass 1: n=5/cell against a pre-registered target of n≥25/cell. Every verdict below is provisional and directional, not the final pre-registered call.** 3 models (gpt-4o, deepseek-chat, gemini-2.5-flash), 24 cells (3 domains × 2 frames × 2 investigate-costs × 2 pressure).

## What the decision rule actually says

### 1. Core claim ("action agreement can conceal epistemic divergence") — **SURVIVES the confound check**

| | action agreement (mode share) | mean belief spread (std dev) |
|---|---|---|
| boring (neutral frame + costed investigate) | 78.9% | 0.223 |
| spicy (accusatory frame or free investigate) | 76.6% | 0.232 |

Nearly identical in both conditions. The pattern — models converge on the same action ~78% of the time while their stated belief spreads by ~0.22-0.23 (on a 0–1 scale, that's large) — does **not** depend on the accusatory frame or the free-investigate confound the audit flagged. It holds in the boring condition too.

### 2. Causal-calibration finding (v0.2's "correct action, uncalibrated outcome") — **survives, but much smaller than originally measured**

| | harmActErr | selfConsistencyGap |
|---|---|---|
| boring | 0.113 | 0.035 |
| spicy | 0.102 | 0.017 |

Survives the same confound check — if anything slightly *larger* in the boring condition. But read the magnitude against v0.2's original number: v0.2 measured outcome-dimension MSE of **0.943** (near-maximal) using one ambiguous "will the bad thing still happen" field. Here, with the same causal question split into three separated, explicitly-worded targets (`P(threat)`, `P(harm | do(act))`, `P(harm | do(wait))`), the error is **0.10–0.11** — an order of magnitude smaller.

**Not part of the pre-registered rule, but worth stating plainly:** this is exactly the outcome the audit's competing explanation (C) — measurement artifact — predicted. The original v0.2 number was likely inflated by an ambiguous elicitation format, not purely a causal-reasoning failure. A real, smaller effect remains (harmActErr ≈ 0.10 is not zero), but "near-maximal miscalibration" was substantially a framing artifact. RESULTS.md's v0.2 section needs a correction note pointing here, not a quiet reword.

### 3. Between-model signal — **not established at this n**

ICC(threatErr) = **0.0175** (between-model variance ÷ total variance, one-way, no small-sample correction). Between-model variance is a rounding error next to within-model noise at n=5/cell. This is the audit's core methodological ask (point 2), answered honestly: **we cannot currently tell one model's calibration apart from another's at this sample size.** Any future claim of the form "model X is better calibrated than model Y" needs Pass 2 (or more) before it means anything.

### 4. Manipulation check — 73.5% correct

Models self-report noticing time/authority pressure correctly about 3 times in 4 (vs. the pressure flag actually being on/off). Decent, not perfect — some fraction of "pressure response" claims could still be models pattern-matching on the word "требует" rather than genuinely registering urgency, but this isn't the ~50% (coin-flip) result that would have invalidated pressure-based claims outright.

### 5. New observation, not pre-registered: action-agreement ≠ oracle-agreement

Models agree with **each other** on action ~78% of the time, but agree with the **oracle's own normatively optimal action** only ~51% of the time (mean `actionAgreesWithOracle` across all 359 runs). Convergence is not convergence-on-correctness — models are consistently reaching for the same action, and that action is coin-flip-adjacent to what the Bayes-optimal policy would pick given the same evidence. This is a new candidate finding, not yet stress-tested itself — flagging it for Pass 2 rather than asserting it.

## What this changes right now

- The two flagship findings in RESULTS.md are **not retracted and not yet fully restored** — Pass 1 direction is positive (both survive the confound check) but n=5 is below the pre-registered bar, so RESULTS.md stays marked hypothesis-under-test until Pass 2.
- The v0.2 outcome-dimension number (0.943) needs an explicit correction note — not removal, a note — pointing to this much smaller re-measurement under a cleaner elicitation format.
- No between-model comparison claim is supportable yet. None has been made in this repo, and none should be until ICC clears the noise floor.
- Pass 2 (n≥25/cell) is the natural next step given the harness ran cleanly (359/360) and the balance situation improved. Not started without a separate go-ahead — this pass was already a meaningful spend.

## Explicitly not covered by Pass 1

Artifact-control arm (paraphrase/field-order/language/free-text), human baseline, reasoning-model harness with retry-until-valid — all still open, per the original design in `CLAIMS-FREEZE.md`.
