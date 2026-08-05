# Stress test — Pass 2 results (2026-08-05) — CONFIRMATORY, n=25/cell

Pre-registered decision rule and design: [`../CLAIMS-FREEZE.md`](../CLAIMS-FREEZE.md). Pilot: [`PASS1-RESULTS.md`](PASS1-RESULTS.md) (n=5/cell, directional only). This run meets the pre-registered target (**n≥25/cell**) — its verdicts are the confirmatory call, not a preliminary read.

1797/1800 successful runs (3 models: gpt-4o, deepseek-chat, gemini-2.5-flash × 24 cells × 25 trials). Raw data: [`../results/stress-pass2-2026-08-05.json`](../results/stress-pass2-2026-08-05.json), mechanical analysis: [`../results/stress-pass2-analysis-2026-08-05.json`](../results/stress-pass2-analysis-2026-08-05.json).

## Verdicts (per the pre-registered decision rule)

### 1. Core claim — "action agreement can conceal epistemic divergence" — **CONFIRMED**

| | action agreement (mode share) | mean belief spread (std dev) |
|---|---|---|
| boring (neutral frame + costed investigate) | 79.1% | 0.211 |
| spicy (accusatory frame or free investigate) | 77.4% | 0.210 |

Nearly identical to Pass 1's directional read (78.9%/0.223 vs 76.6%/0.232) — the pattern replicates at full power and is essentially unchanged by scaling 5× the sample. Models converge on the same action ~78% of the time while their stated belief spreads by ~0.21 regardless of the frame/cost confound. **This claim graduates from "hypothesis under test" to "finding."**

### 2. Causal-calibration claim (v0.2's "correct action, uncalibrated outcome") — **CONFIRMED, magnitude stable**

| | harmActErr | selfConsistencyGap |
|---|---|---|
| boring | 0.145 | 0.029 |
| spicy | 0.138 | 0.020 |

Confirms Pass 1's magnitude correction: the effect is real but ~0.14, not the original v0.2 figure of 0.943. The three-separated-target elicitation format holds up under 5× the data — this was not a Pass-1 fluke. **This claim also graduates to "finding," at the corrected magnitude, not the original one.**

### 3. Between-model signal — **still not detectable, now at full confidence**

ICC(threatErr) = **0.0033** (down from Pass 1's already-low 0.0175, n=1797). At full pre-registered power, between-model variance remains negligible next to within-model noise. This is no longer a "maybe it's just Pass-1 noise" caveat — **it is the confirmed answer**: this instrument, at this sample size and with these three models, cannot distinguish one model's calibration from another's. Any claim of the form "model X is better calibrated than model Y" is unsupported by this data and should not be made from it.

### 4. Manipulation check — 74.2% (Pass 1: 73.5%) — consistent, unchanged.

## What this changes

- RESULTS.md's flagship findings are **un-frozen** for the two claims above — CLAIMS-FREEZE.md status updated accordingly.
- The ICC null result becomes an explicit, confirmed limitation, not a hedge — stated plainly rather than softened.
- Still not covered: artifact-control arm, human baseline (now underway — see [Gate 3](../../oko-arena/public/human-harness/index.html) at metainsight.app/research), reasoning-model harness with retry-until-valid.
