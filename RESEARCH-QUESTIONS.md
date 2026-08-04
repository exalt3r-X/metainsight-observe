# Research Questions

This repo used to lead with findings. After the [2026-08-04 audit](CLAIMS-FREEZE.md), it leads with questions instead — findings are downstream of these, not the other way around.

The distinction that matters (borrowed from ordinary research discipline, not invented here):

| Level | Example | Status |
|---|---|---|
| **Fact** | The benchmark is reproducible; results are computed from externally expressed data. | Established |
| **Observation** | In our scenarios, models often pick the same action despite visibly different stated confidence. | Established |
| **Hypothesis** | Frontier LLMs converge on policy (action) faster/more reliably than on epistemic state (belief). | **Under test — this document** |
| **Theory** | "We discovered a new principle of AI reasoning." | Not claimed. Not close. |

Everything below lives at the hypothesis level. Each RQ links to the specific finding it's trying to explain and the competing explanations from the audit that the [pre-registered stress test](CLAIMS-FREEZE.md#test-design) is designed to separate.

---

## RQ1 — Do models converge on action faster than on belief?

**Motivating observation:** Batch 001 — 10 models, 6 scenarios, same action class, wildly different starting confidence (workplace scenario: 70–95% spread on intentional-attribution before any evidence).

**Competing explanations:**
- **A — real property.** Models genuinely settle a policy before they settle a belief (safety training rewards the terminal action, not the intermediate confidence number).
- **B — benchmark artifact.** The action space is small and the "safe" option is obvious regardless of belief; convergence is a ceiling effect of *this* action set, not evidence about belief-vs-action ordering in general.
- **C — measurement artifact.** We are reading "convergence" off verbalized numbers that are format-sensitive, not off any real internal ordering.

**What would resolve it:** the frame × cost × pressure factorial, scored against the oracle's normative action under matched conditions, with an artifact-control arm (paraphrase / field-order / language / free-text) to separate B and C from A.

---

## RQ2 — Can identical actions conceal different epistemic states?

**Motivating observation:** Same as RQ1, restated as the core README claim ("action agreement can conceal epistemic divergence"). This is the flagship claim currently frozen.

**Competing explanations:** same A/B/C split as RQ1 — this RQ is the general form, RQ1 is the causal-ordering version of it.

**What would resolve it:** same test. If the divergence in stated belief tracks the *accusatory-frame* manipulation more than the *neutral* one, the claim was measuring frame sensitivity (B/C), not a general property (A) — see the audit's point on Batch 002 being tautological ([CLAIMS-FREEZE.md](CLAIMS-FREEZE.md), agreement point 4).

---

## RQ3 — Does authority/urgency pressure increase confidence without increasing evidence?

**Motivating observation:** Batch 002 — under time/authority/cost/window pressure, escalation rises ~17–20pp but full irreversible action stays ≈0%, and the effect concentrates entirely in the one scenario that already had a high accusatory prior.

**Competing explanations:**
- **A — real property.** Pressure genuinely amplifies confidence independent of evidence, but only past some prior threshold (interaction effect).
- **D — refusal-training ceiling.** The ≈0% irreversible-action floor may reflect trained refusal, not calibrated caution — indistinguishable without a condition where irreversible action is *correct*.

**What would resolve it:** crossing pressure with frame (not confounded, unlike Batch 002) plus the floor cell (`real_threat` instances, already present in every run via the oracle's `hTrue` draw) — lets us tell "well-calibrated under pressure" apart from "trained to refuse regardless of stakes."

---

## RQ4 — Are confidence revisions evidence-driven or instruction-driven?

**Motivating observation:** Evidence-mediated revision stays +14–16pp above the neutral "reconsider" control even under pressure (Batch 002) — the one result that currently reads as good news.

**Competing explanations:**
- **A — real property.** Models genuinely weight specific evidence more than a generic nudge, a form of epistemic discipline.
- **C — measurement artifact.** Both conditions may just be reading off surface prompt features (evidence text is longer/more specific than "reconsider," which alone could explain a bigger shift).

**What would resolve it:** the manipulation check ("did you notice pressure/urgency in this scenario?") plus the three separated prediction targets — if revision tracks `P(threat)` but not `P(harm | do(action))`, the "evidence-driven" story is incomplete (this is also the mechanism behind the v0.2 causal-calibration finding — see RESULTS.md).

---

## Discipline, not decoration

Per the audit's core recommendation: for each RQ, the working assumption is that the **boring explanation (B/C) is true** until the pre-registered test survives an honest attempt to break it. An RQ that "wins" after ten attempts to kill it is worth something. An RQ nobody tried to kill is not a finding — it's a slogan.

See [`CLAIMS-FREEZE.md`](CLAIMS-FREEZE.md) for the full audit, the disagreement points, and the exact test design and decision rule these RQs are pre-registered against.
