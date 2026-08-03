# Limitations

Stated by the author, so you don't have to discover them the hard way.

- **Synthetic scenarios.** All twelve cases (6 false_alarm + 6 real_threat as of v0.2) are fictional with ground truth fixed by construction. This measures *decision process*, not world knowledge, and transfer to real agent workloads is an open question.
- **Scenarios are currently in Russian.** The methodology, schemas, metrics and docs are English; the scenario text itself (`benchmark/cases.js`) is Russian. Results across models are internally comparable (same language for all), but an English scenario set is needed before cross-language claims. Contributions welcome.
- **Small benchmark.** 12 scenarios (two epistemic skeletons, mirrored), 10 models on the v0.1 baseline, 5 models × 3 trials on v0.2. Enough for a preliminary finding, not for a leaderboard. Per-cell pressure samples are n=5; per-cell v0.2 samples are n=3.
- **Ground truth was one-sided through v0.1** — all six original cases resolved as false alarms, so a purely-cautious policy could score well without real judgment. v0.2 added six mirror real_threat cases; still only two skeletons, not a continuous cost-of-information spectrum (see roadmap).
- **Not production validated.** Anomaly patterns here come from a controlled benchmark. No claim is made that they predict failures of deployed agents — that is precisely the research program, not a result.
- **Externally expressed signals only.** We record what the model *states* (confidences, choices). Stated confidence is not internal probability; models may verbalize numbers performatively. The reflection-control (evidence-mediated revision) partially addresses this, not fully.
- **Structured-output constraint.** Models answer in forced JSON with capped tokens. Reasoning-heavy models that can't fit the format fail runs (e.g., gemini-2.5-pro consistently broke JSON) — a selection effect on which models appear in results.
- **Known scenario ceiling.** In calm text, modern models converge on the socially safe reversible action (Batch 001). Discriminative power comes from earlier layers (priors, trajectories) and from pressure variants (Batch 002).
- **Contamination.** Published scenarios are trainable-on. Treat the fixed six as a reference set; rotate fresh same-skeleton scenarios for real assurance evaluation.
- **Evolving methodology.** Metric formulas (RQ constants, IAD weights) are v0.1 choices, not derived from theory. Expect breaking changes before v1.0.
- **See also [`CLAIMS-FREEZE.md`](CLAIMS-FREEZE.md)** — an independent 3-reviewer audit (2026-08-04) found deeper issues than this list originally covered (construct validity, confounded pressure×prior design, a live reasoning-model selection-bias incident) and a pre-registered test designed to resolve them.
