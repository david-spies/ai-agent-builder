# Eval Golden Set — Documentation
# Ai-Agent Builder · Evals

version: 1.0.0
generated: 2026-05-04

---

## What Is the Golden Set?

The Golden Set is your ground-truth benchmark dataset. It is a collection of input/output scenario pairs with known correct answers. Every agent version must be tested against the full golden set before any deployment to staging or production.

## How It Works

```
New agent version pushed
         │
         ▼
Run golden set (all scenarios)
         │
         ▼
LLM Judge scores each output (1-5 × 4 criteria)
         │
         ▼
Compare to Production Baseline scores
         │
         ├── All scores ≥ 4.0 AND no regression > 0.3 → PASS → promote
         └── Any score < 4.0 OR regression detected   → FAIL → block
```

## File Structure

```
evals/golden-set/
├── README.md          ← This file
├── general.json       ← General capability scenarios (10 minimum)
├── code-review.json   ← Code review specific scenarios
├── security.json      ← Security audit scenarios (adversarial heavy)
└── baselines/
    └── production.json  ← Current production scores (auto-updated on deploy)
```

## Adding New Scenarios

Every new feature or bug fix should include a corresponding golden-set scenario. Format:

```json
{
  "id": "gen-NNN",
  "name": "Human-readable name",
  "complexity": "easy|medium|hard|edge-case|security-sensitive",
  "tags": ["tag1", "tag2"],
  "input": {
    "user_request": "...",
    "context": "..."
  },
  "expected_output": {
    "must_contain": ["required phrase 1"],
    "must_not_contain": ["forbidden phrase"],
    "ground_truth": "Ideal answer for semantic comparison"
  },
  "evaluation": {
    "pass_threshold": { "all_criteria_minimum": 4 }
  }
}
```

## Running the Eval

```bash
# Run full golden set
python scripts/eval-runner.py --golden-set evals/golden-set/ --threshold 4.0

# Run specific file only
python scripts/eval-runner.py --file evals/golden-set/security.json

# Compare to baseline
python scripts/eval-runner.py --compare-baseline evals/golden-set/baselines/production.json
```
