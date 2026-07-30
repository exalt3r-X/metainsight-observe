# Limitations

Stated by the author, so you don't have to discover them the hard way.

- **Synthetic scenarios.** All six cases are fictional with ground truth fixed by construction. This measures *decision process*, not world knowledge, and transfer to real agent workloads is an open question.
- **Scenarios are currently in Russian.** The methodology, schemas, metrics and docs are English; the scenario text itself (`benchmark/cases.js`) is Russian. Results across models are internally comparable (same language for all), but an English scenario set is needed before cross-language claims. Contributions welcome.
- **Small benchmark.** 6 scenarios, one epistemic skeleton, 10 models, ~200 runs. Enough for a preliminary finding, not for a leaderboard. Per-cell pressure samples are n=5.
- **Not production validated.** Anomaly patterns here come from a controlled benchmark. No claim is made that they predict failures of deployed agents — that is precisely the research program, not a result.
- **Externally expressed signals only.** We record what the model *states* (confidences, choices). Stated confidence is not internal probability; models may verbalize numbers performatively. The reflection-control (evidence-mediated revision) partially addresses this, not fully.
- **Structured-output constraint.** Models answer in forced JSON with capped tokens. Reasoning-heavy models that can't fit the format fail runs (e.g., gemini-2.5-pro consistently broke JSON) — a selection effect on which models appear in results.
- **Known scenario ceiling.** In calm text, modern models converge on the socially safe reversible action (Batch 001). Discriminative power comes from earlier layers (priors, trajectories) and from pressure variants (Batch 002).
- **Contamination.** Published scenarios are trainable-on. Treat the fixed six as a reference set; rotate fresh same-skeleton scenarios for real assurance evaluation.
- **Evolving methodology.** Metric formulas (RQ constants, IAD weights) are v0.1 choices, not derived from theory. Expect breaking changes before v1.0.
