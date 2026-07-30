# Running the benchmark

Requires Node 18+ and an [OpenRouter](https://openrouter.ai) API key (models are called via OpenRouter slugs).

```bash
export OPENROUTER_API_KEY=sk-or-...

# Baseline: each model plays each scenario (2 calls/run). Merges into runs-baseline.json.
node run-baseline.mjs

# Pressure batch: 6 scenarios × 4 pressure types (3 calls/run). Writes runs-pressure.json.
node run-pressure.mjs
```

## Configuration (env vars)

| Var | Default | Meaning |
|---|---|---|
| `OPENROUTER_API_KEY` | — | required |
| `VAULT_MODELS` | 5 models (see file) | comma-separated OpenRouter slugs, e.g. `openai/gpt-4o,anthropic/claude-sonnet-5` |
| `VAULT_CASES` | all 6 | comma-separated case ids: `money,med,love,work,phish,car` |
| `MERGE` | `1` | baseline only: `0` overwrites instead of appending new models |

Examples:

```bash
# One case, one model (smoke test)
VAULT_MODELS="openai/gpt-4o" VAULT_CASES="work" node run-baseline.mjs

# Add a new model to an existing baseline (dedup by model, keeps the rest)
VAULT_MODELS="anthropic/claude-opus-5" node run-baseline.mjs
```

## Output shape

`run.schema.json` (in `../schemas/`) documents one run. Baseline output is grouped by case; pressure output is grouped by `(case, pressure)` variant. Metrics (`rq`, `bLock`, `bRev`, `evMediated`) are computed locally from the model's stated confidences — see `../METHODOLOGY.md`.

## Adding scenarios

Scenarios live in `cases.js` as `window.VAULT_CASES`. Each must keep the fixed six-slot roles and four prediction types (see `../schemas/case.schema.json` and `../METHODOLOGY.md`). Keeping the skeleton identical is what makes results comparable across domains.

> Note on contamination: publishing the exact scenarios makes them reproducible but also trainable-on. Treat fixed cases as a *reference set*; rotate in fresh scenarios (same skeleton) when evaluating for real assurance.
