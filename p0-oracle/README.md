# P0 — Bayesian oracle engine + pre-registered stress test

Deterministic scoring layer: given an explicit Bayes net (hypotheses, prior, source likelihoods, dependency graph, action payoffs), computes the *normative* posterior, expected utility, and three regret types — independent of any LLM call. Models are scored against this, not against each other.

| File | Role |
|---|---|
| `oracle-engine.mjs` | Core math: `posterior`, `voi`, `policyRegret`/`outcomeRegret`/`beliefGap`, double-counting elimination for dependent sources. |
| `oracle-engine.test.mjs` | 19 unit tests on the engine itself. |
| `oracle-pilot-case.mjs` | Hand-authored numbers (not LLM-generated) — the ground truth every other case imports from. |
| `oracle-iso-cases.mjs` / `oracle-iso.test.mjs` | 3 domain wrappers (clinical/workplace/supply) around the *same* numbers — anti-contamination structure-vs-pattern-matching check. |
| `oracle-stress-cases.mjs` / `oracle-stress.test.mjs` | **Pre-registered stress test** case variants: 3 domains × 2 frames (neutral/accusatory) × 2 investigate-costs (free/costed) = 12 cases, pressure applied at prompt-time (crossed, not confounded). |
| `oracle-stress-runner.mjs` | Executes the factorial (× pressure on/off = 24 cells) against real models, elicits 3 separated targets instead of one ambiguous belief field. |
| `oracle-stress-analysis.mjs` | Applies the pre-registered decision rule from [`../CLAIMS-FREEZE.md`](../CLAIMS-FREEZE.md) mechanically — the numbers decide the verdict, not prose. |

Run: `node oracle-*.test.mjs` (no API key needed) to verify the math and case construction. `oracle-stress-runner.mjs` needs `OPENROUTER_API_KEY` and makes real model calls — see `CLAIMS-FREEZE.md` for what this pass does and doesn't cover.
