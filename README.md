# Metainsight Observe

**Decision observability for autonomous AI agents.**

We don't evaluate whether an agent was *right*.
We evaluate whether it had enough **evidence**, **authority** and **calibration** to justify acting.

```
Agent
  ↓
Decision Receipt
  ↓
Metainsight Observe      ← this repository (the Observe layer + benchmark)
  ↓
Anomaly Detection
  ↓
Warning / Challenge / Gate
```

Conventional agent observability (OpenTelemetry, Langfuse, LangSmith, Helicone, W&B) answers **"what happened?"** — which tool was called, cost, latency, prompt/output, error.
Metainsight answers a different question: **"why did the agent decide it was entitled to act?"** — did it have sufficient evidence, did it stay within its authority, was its confidence calibrated, did it treat dependent sources as independent, did it revise on evidence or on mere instruction.

> Datadog observes the system. Metainsight observes the *formation of decisions* inside it.

This repo is the **public research layer**: the benchmark, methodology, JSON schemas, an example Decision Receipt, and reproducible model results. The production runtime (scoring lenses, anomaly rules, ranking, pipeline) is intentionally **not** part of this repository.

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
METHODOLOGY.md         — scenario skeleton, protocol, metric formulas
RESULTS.md             — Batch 001 + Batch 002 tables and reading guide
LICENSE                — MIT (code). Data under CC-BY-4.0 (see below).
benchmark/
  cases.js             — the 6 scenario definitions (window.VAULT_CASES)
  run-baseline.mjs      — runner: each model plays each scenario (2-call protocol)
  run-pressure.mjs      — runner: pressure variants (3-call protocol w/ reflection control)
  README.md            — how to run
results/
  baseline-001.json    — frozen baseline: 5 models × 6 scenarios (30 runs)
  baseline-extended.json — 10 models × 6 scenarios (60 runs)
  batch-002.json       — pressure batch: 6 × 4 × 5 (119 runs)
schemas/
  case.schema.json     — scenario JSON schema
  run.schema.json      — per-run output schema
  decision-receipt.example.json — one run expressed as a Decision Receipt
```

Run it on your own models: [`benchmark/README.md`](benchmark/README.md).

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

## License
Code: **MIT** (see `LICENSE`). Data & results (`results/`, scenario text): **CC-BY-4.0** — reuse freely with attribution.
