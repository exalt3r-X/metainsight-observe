# Decision Observability for AI Agents

One question:

> **How do you know an AI agent actually had enough evidence to justify its action?**

<p align="center"><img src="assets/demo.svg" alt="npm run benchmark → per-model RQ/bias table → anomaly detected" width="760"></p>

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

See [`RESULTS.md`](RESULTS.md) for full tables and [`METHODOLOGY.md`](METHODOLOGY.md) for the protocol.

---

## Repository layout

```
README.md              — this file
ANOMALIES.md           — real anomaly examples from the runs (start here)
METHODOLOGY.md         — scenario skeleton, protocol, metric formulas
RESULTS.md             — Batch 001 + Batch 002 tables and reading guide
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

## Positioning (staged, deliberately narrow first)

1. **Decision observability for AI agents** ← where this repo sits today (Observe mode).
2. **Runtime decision assurance** — Warn / Challenge / Gate / Circuit-Breaker, once enough data and cases exist.
3. **Adaptive decision governance** — later.

We start with the narrow, falsifiable promise (observability) rather than claiming full control of agents from day one.

---

## Status & honesty

Preliminary research artifact. The scenarios are fictional; the "ground truth" is fixed by construction. Metainsight records **externally expressed** confidence trajectories and decision commitments under a controlled evidence sequence — it does **not** claim access to a model's internal cognition. Results are small-sample and meant to be reproduced and challenged, not treated as a leaderboard.

---

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
