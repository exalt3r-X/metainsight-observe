# Decision Observability for AI Agents

One question:

> **How do you know an AI agent actually had enough evidence to justify its action?**

<p align="center"><img src="assets/demo.svg" alt="npm run benchmark → per-model RQ/bias table → anomaly detected" width="760"></p>

> ✅ **Claims un-frozen (2026-08-05).** An independent 3-reviewer audit (2026-08-04) flagged the findings below as unconfirmed patterns and designed a pre-registered stress test to resolve them. That test ran at full power (n=25/cell, 1797/1800 runs — [`p0-oracle/PASS2-RESULTS.md`](p0-oracle/PASS2-RESULTS.md)). Two flagship claims are now confirmed. One limitation is also confirmed, not just hedged: this benchmark cannot currently tell one model's calibration apart from another's (ICC≈0.003) — no between-model ranking claim is supported. Full history in [`CLAIMS-FREEZE.md`](CLAIMS-FREEZE.md), open questions in [`RESEARCH-QUESTIONS.md`](RESEARCH-QUESTIONS.md).
>
> **What we can now defend, precisely:** in these synthetic scenarios, frontier models reliably converge on the same action (~78%) despite markedly different stated confidence (~0.21 spread) — confirmed, not a frame or free-action artifact. What we still cannot defend: any claim that one specific model is better calibrated than another.

## Why this exists

Existing observability tools answer: **"What happened?"** — prompt, tool calls, latency, cost, errors.
This project asks a different question: **"Should the agent have acted at all?"**

That is not a criticism of existing tools — tracing platforms and agent-discovery projects explore other facets of agent observability. This repo explores the *epistemic* facet: we don't ask whether the agent was **correct** (correct outcomes routinely come from broken reasoning, and broken outcomes from sound reasoning). We ask whether it had enough **evidence**, **authority** and **calibration** to act.

Decision observability adds: **evidence quality · confidence evolution · rejected alternatives · authority boundaries · irreversible-action analysis · anomaly detection.**

```
Agent
  ↓
Decision Receipt        ← machine-readable record of one decision's provenance
  ↓
Decision Observability  ← this repository (methodology + benchmark)
  ↓
Anomaly Detection
  ↓
Warn / Challenge / Escalate / Block
```

A Decision Receipt in one glance:

```json
{
  "action": "transfer_money",
  "confidence": 0.74,
  "evidence": ["bank_app_status", "sender_screenshot", "transaction_log"],
  "rejected": [{ "action": "chargeback", "why": "irreversible below evidence threshold" }],
  "authority": "finance:read+hold",
  "irreversible": true,
  "reopen_if": ["status changes to 'processing'", "independent source contradicts"]
}
```

What anomaly detection catches (real patterns from this benchmark — see [`ANOMALIES.md`](ANOMALIES.md)):

```
Agent confidence: 0.31 → 0.92.  No new evidence.   ⚠️ Unsupported confidence jump
Two confirming sources → actually one source, echoed twice.   ⚠️ Dependent evidence
Accusation committed at 0.95 on a single screenshot.   ⚠️ Intent-attribution anomaly
```

## Research scope

This repository contains: **methodology · benchmark (6 scenarios) · JSON schemas · examples · reproducible model results.**
It intentionally excludes: **runtime · production scoring · intervention engine · private datasets · commercial integrations · deployment infrastructure.**

This is the research layer. When asked "where is the real engine?" — the answer is: here is the methodology and the evidence; the production runtime stays closed.

---

## The core idea: three separable layers of a decision

Most evaluations collapse a decision into a single "was the action right?" score. That hides the interesting failures. We separate:

1. **Initial interpretation** — what the agent believed *before* sufficient evidence.
2. **Belief revision** — how it updated when evidence arrived (direction, magnitude, trigger).
3. **Action policy** — what it was authorized to do and what it actually did.

The central empirical result of this benchmark:

> **Action agreement can conceal epistemic divergence. Action safety ≠ epistemic safety.**
> Two agents may take the same cautious action while differing substantially in initial calibration, intent attribution, and responsiveness to evidence.

---

## Metrics

All are computed from externally expressed data (confidence trajectories + committed decisions). **No claim is made about private model cognition.**

| Metric | What it captures |
|---|---|
| **Epistemic Bias** | How high the agent started in an adverse / intent-attributing interpretation *before* sufficient evidence. |
| **Revision Quality (RQ)** | Direction + proportionality of the belief update after evidence (not just "how much it moved"). |
| **Action Discipline** | Share of reversible / information-seeking actions vs. escalation vs. irreversible action. |
| **Impulse–Action Distance (IAD)** | Gap between the pre-analysis impulse and the final action. Large gap = genuine update *or* a suppressed impulse masked by a templated safe answer. |
| **Evidence-mediated revision** | Belief shift caused by *specific evidence* minus the shift caused by a neutral "think again". Positive = data-driven update; near-zero = interface compliance. |

---

## What the benchmark found

**Baseline (calm text, no pressure) — 10 models × 6 scenarios.**
Every model converged on the same action class (gather information before acting irreversibly) and the same false-alarm interpretation. But their **starting beliefs diverged sharply** — strongest in the workplace-attribution scenario, where several models began at **70–95% confidence** that a colleague *intentionally* stole credit, before revising down as evidence arrived. The divergence lives in the *prior*, not the *action*.

**Batch 002 (controlled pressure) — 6 scenarios × 4 pressure types × 5 models = 119 runs.**
Pressures: time limit, authority demand, cost-of-waiting, irreversible-opportunity.

- Full irreversibility (`act`) stays ≈ **0%** under all pressure types — the threshold holds.
- Pressure produces **~17–20% escalation** (raise to authority / alert others) — modest, bounded erosion.
- Breakdown is **content-dependent, not pressure-type-dependent**: it concentrates in the emotionally-charged accusatory scenario (workplace: **40–80%** leave a reversible action) while a neutral scenario (auto-repair) holds at **0%**. The risk factor is **accusatory prior × pressure**, not pressure alone.
- Evidence-mediated revision stays **+14…+16pp** even under pressure — models still update on real evidence more than on a neutral "reconsider". A signal *in favour* of epistemic safety.

**v0.2 (balanced ground truth) — 5 models × 12 scenarios × 3 trials = 180 runs.**
Six mirror **real_threat** scenarios added, where hesitation causes harm and decisive action is correct. Result: models choose the right action 99% of the time — but rate the bad outcome as ~99% likely anyway, as if their own intervention had no causal effect (outcome-dimension error 0.943, near-maximal, vs 0.001 on the temporal dimension). Correct action concealed a causal-calibration failure — the mirror image of the baseline finding.

See [`RESULTS.md`](RESULTS.md) for full tables and [`METHODOLOGY.md`](METHODOLOGY.md) for the protocol.

---

## Repository layout

```
README.md              — this file
RESEARCH-QUESTIONS.md  — RQ1–4: the open questions, not the findings — start here if you're skeptical
ANOMALIES.md           — real anomaly examples from the runs
METHODOLOGY.md         — scenario skeleton, protocol, metric formulas
RESULTS.md             — Batch 001 + Batch 002 tables and reading guide
CLAIMS-FREEZE.md        — 2026-08-04 audit + pre-registered stress-test design
LICENSE                — MIT (code). Data under CC-BY-4.0 (see below).
benchmark/
  cases.js             — the 6 scenario definitions
  run-baseline.mjs      — runner: each model plays each scenario (2-call protocol)
  run-pressure.mjs      — runner: pressure variants (3-call protocol w/ reflection control)
  report.mjs           — prints the summary table below
results/
  baseline-001.json    — frozen baseline: 5 models × 6 scenarios (30 runs)
  baseline-extended.json — 10 models × 6 scenarios (60 runs)
  batch-002.json       — pressure batch: 6 × 4 × 5 (119 runs)
schemas/
  case.schema.json · run.schema.json · decision-receipt.example.json
```

Run it on your own models:

```bash
export OPENROUTER_API_KEY=...
VAULT_MODELS="openai/gpt-4o,anthropic/claude-sonnet-5" npm run benchmark
npm run report
```

```
model                    RQ   bias  discipline
──────────────────────────────────────────────
deepseek-chat            98    48%        100%
qwen3-235b-a22b          96    46%        100%
grok-4.5                 90    35%        100%
gpt-5.6-sol              89    22%        100%
claude-opus-5            87    22%        100%
...
```

Note the decoupling the table already shows: **high Revision Quality does not imply low Epistemic Bias** — deepseek revises excellently (RQ 98) from a heavily accusatory start (48%), while gpt-5.6-sol starts calibrated (22%). Two different safety properties, one score would hide it.

---

## Related work

Adjacent benchmarks are emerging — we cite them gladly; the angles differ:

- **DEMM-Bench** ([arXiv:2606.20634](https://arxiv.org/abs/2606.20634)) measures whether an agent runtime's *records* (traces, ledgers, schemas) are sufficient to reconstruct decision-level properties after the fact — governance-evidence sufficiency. Its "container fallacy" (presence of a trace ≠ sufficiency of evidence) is a post-hoc audit cousin of our action-safety ≠ epistemic-safety claim.
- **Evidence-grounding benchmarks** (e.g. [arXiv:2605.08828](https://arxiv.org/abs/2605.08828)) test whether an agent keeps its actions grounded in the true environment state when observations are stale, wrong, or malicious.

This repo measures a third thing: **how the agent forms and revises confidence before acting** — initial priors, dependent-source handling, evidence-mediated revision, pressure response. Audit sufficiency (DEMM), observation grounding, and belief formation (here) are complementary layers of the same problem.

---

## Relationship to the Decision Receipt spec

The **Decision Receipt** — the machine-readable record of a single decision's provenance (observations available, competing hypotheses, confidence, rejected alternatives, authority scope, action threshold, reopen conditions) — is specified separately in the protocol repo:

→ **[cognitive-passport](https://github.com/exalt3r-X/cognitive-passport)** (schema, SPEC, Decision Receipt draft).

This repository *produces* Decision Receipts from a controlled benchmark; that repo *specifies their format*. `schemas/decision-receipt.example.json` here shows one benchmark run in that shape.

---

## What this repository deliberately does NOT contain (the moat)

Published here = **what helps the community understand and verify the idea**: the concept, the Decision Receipt format, the metric definitions, synthetic scenarios, model results, and the evaluation method. That earns reputation and a shot at authoring the approach — it is *not* a business moat.

Kept private (what actually creates and defends product value):
- the production **runtime** that observes real agents;
- **scoring lenses** and **anomaly-detection rules**;
- **intervention / gating policy** (Warn / Challenge / Gate / Circuit-Breaker logic);
- the **growing base of real observations** across many agents over time;
- **Cognitive Passport** accumulation and commercial integrations.

The defensible part of Metainsight is the runtime + the accumulated observation base — things that compound with time and cannot be obtained by cloning a repository — not the existence of the idea or a JSON schema. This repo is a **distribution instrument for the idea**, not protection for the business.

One more reframe worth stating directly: what's actually valuable here is not any single number in RESULTS.md — those are frozen, contested, and might not survive the stress test. It's the **method**: a reproducible way to run a decision-observability audit on any agent, get externally-expressed belief trajectories out, and score them against a normative oracle instead of vibes. If you take nothing else from this repo, take the harness and point it at your own agent — that's the asset, not the conclusion.

## Positioning (staged, deliberately narrow first)

1. **Decision observability for AI agents** ← where this repo sits today (Observe mode).
2. **Runtime decision assurance** — Warn / Challenge / Gate / Circuit-Breaker, once enough data and cases exist.
3. **Adaptive decision governance** — later.

We start with the narrow, falsifiable promise (observability) rather than claiming full control of agents from day one.

---

## Status & honesty

**Claims frozen as of 2026-08-04 — see [`CLAIMS-FREEZE.md`](CLAIMS-FREEZE.md).** An independent audit (3 flagship-model reviewers) found the headline findings in this repo are plausible but not yet disentangled from prompt/framing artifacts, and flagged a real selection-bias instance in our own P0 run (see the freeze doc). Nothing below is retracted — it is downgraded from "finding" to "hypothesis under test" until a pre-registered stress test runs.

Preliminary research artifact. The scenarios are fictional; the "ground truth" is fixed by construction. Metainsight records **externally expressed** confidence trajectories and decision commitments under a controlled evidence sequence — it does **not** claim access to a model's internal cognition. Results are small-sample and meant to be reproduced and challenged, not treated as a leaderboard.

---

## Share your results (opt-in)

Nothing in this repo phones home — no telemetry, ever. If you ran the benchmark and want your results in the community dataset:

```bash
npm run submit   # prints an aggregate summary + an issue link; nothing is sent automatically
```

Submissions contain model slugs and aggregate metrics only (no keys, no prompts, no personal data). Once enough independent submissions accumulate, a community results table will be added to RESULTS.md — models ranked by Revision Quality, Epistemic Bias and Action Discipline across independent runs.

## Break the methodology

The most useful contribution is not feedback — it's a break. Concretely:

- **Find a scenario where the skeleton fails** — where the "diagnostic key" doesn't actually discriminate, or the dependent-source trap is unfair.
- **Show a false-positive anomaly** — a confidence jump our rules would flag that is actually justified.
- **Beat the metrics** — demonstrate a strategy that games RQ or IAD without genuinely better epistemics.
- **Compare against another methodology** — calibration training sets, decision-journal research, POMDP evals.

Known weaknesses are pre-listed in [`LIMITATIONS.md`](LIMITATIONS.md) — breaking something *not* on that list is the jackpot.

## Collaborate

This is an early research preview and I am explicitly **open to collaboration**:

- **Run the benchmark on your agent or model** — open an issue with your results, parse failures, or methodology objections: [Issue #1](https://github.com/exalt3r-X/metainsight-observe/issues/1). Disagreement is more useful than praise.
- **Researchers** (calibration, AI safety, eval design): if you want to extend the scenario set, add pressure types, or challenge the metrics — issues/discussions are open, co-authorship on a writeup is on the table.
- **Agent builders**: if you want decision-level observability in front of a real agent (the closed runtime layer — Warn / Challenge / Gate), I am looking for **design partners**. Open an issue titled `design-partner` or reach out via [metainsight.app](https://metainsight.app).
- **Anything else** — GitHub Discussions or issues on this repo.

If you build on this, attribution is appreciated (CC-BY-4.0 for data), and I would genuinely like to see what you found.

## License
Code: **MIT** (see `LICENSE`). Data & results (`results/`, scenario text): **CC-BY-4.0** — reuse freely with attribution.

---

*Naming: **Decision Observability** is the methodology · **Observe** is this research project · **[Metainsight](https://metainsight.app)** is the parent ecosystem. Not related to the MetaInsight R package for network meta-analysis.*
