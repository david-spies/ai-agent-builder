---
name: error-policy
spec_version: 1.0.0
component_type: error-handler
version: 1.0.0
description: Multi-step recovery and retry policy that defines structured fallback behavior when agent skills fail. Covers retry strategies with exponential backoff, fallback skill chains, degraded-mode operation, circuit breaker patterns, and cross-skill error propagation. Goes beyond content guardrails — handles systemic failures like unavailable vector databases, API timeouts, and budget exhaustion.
generated: 2026-05-04
---

# Error Policy — Multi-Step Recovery & Retry
# Ai-Agent Builder · Logic Components
# Structured failure recovery: retry, fallback, degrade, and alert.

---

## Purpose

If a vector database is down, the agent shouldn't just fail with an unhandled
exception. It should retry with backoff, fall back to a reasoning-only mode,
alert the on-call engineer, and return a degraded-but-useful partial result.

Error Policy defines that behavior deterministically — as a structured Markdown
configuration the runner interprets as a state machine, not as natural language
instructions the LLM has to "remember."

---

## Error Classification

```
Level 0 — TRANSIENT    Retry immediately. 1-2 retries, no backoff.
                       Examples: HTTP 429, network blip, 502/503/504

Level 1 — RETRYABLE    Retry with exponential backoff.
                       Examples: vector DB timeout, LLM API 500, slow tool

Level 2 — SKILL_FAIL   Skill-level failure — invoke fallback_skill.
                       Examples: LLM Judge fail, security scan error, parse error

Level 3 — DEGRADED     Partial capability — switch to degraded_mode.
                       Examples: vector DB down (→ reasoning-only), tool unavailable

Level 4 — FATAL        Non-recoverable — halt, alert, write partial result.
                       Examples: auth failure, kill switch, budget ceiling hit
```

---

## Default Policy Table

> Override per-skill in the skill's own ## Constraints or via a custom error-policy.md.

| Error Type | HTTP Code / Signal | Level | Retries | Backoff | Fallback | Alert |
|:---|:---|:---|:---|:---|:---|:---|
| Rate limit | 429 | 0 | 3 | 1s, 2s, 4s | — | No |
| Gateway error | 502/503/504 | 0 | 2 | 2s, 5s | — | No |
| LLM API error | 500 | 1 | 2 | 5s, 15s | — | WARN |
| Vector DB timeout | timeout | 1 | 3 | 3s, 9s, 27s | reasoning-only | WARN |
| LLM Judge fail | eval_fail | 2 | 2 | 0s | — | WARN |
| Static analysis error | tool_error | 2 | 1 | 0s | skip-analysis | WARN |
| Vector DB down | conn_refused | 3 | 0 | — | reasoning-only | ERROR |
| Tool unavailable | tool_missing | 3 | 0 | — | {skill-specific} | ERROR |
| Auth failure | 401/403 | 4 | 0 | — | — | CRITICAL |
| Budget ceiling | budget_exceeded | 4 | 0 | — | — | CRITICAL |
| Kill switch | AGENT_KILL_SWITCH | 4 | 0 | — | — | CRITICAL |

---

## Full Schema

```yaml
# error-policy.md configuration block
policies:
  - id: "EP-001"
    trigger:
      error_type: vector_db_timeout
      skill: rag-retrieval.md          # null = applies to all skills
      condition: null                  # optional JSON path condition
    recovery:
      level: 1                         # RETRYABLE
      max_retries: 3
      backoff_strategy: exponential    # fixed | exponential | fibonacci
      initial_backoff_seconds: 3
      max_backoff_seconds: 60
      jitter: true                     # add ±20% randomness to backoff
    on_retries_exhausted:
      action: degrade
      degraded_mode: reasoning-only    # skip vector DB, use LLM context only
      notify: true
      alert_level: ERROR
    output_on_degrade:
      add_warning: true
      warning_message: "Vector DB unavailable — answer from LLM reasoning only. Verify against source documents."
      confidence_penalty: 0.3          # subtract from confidence score

  - id: "EP-002"
    trigger:
      error_type: llm_api_500
      skill: null
    recovery:
      level: 1
      max_retries: 2
      backoff_strategy: exponential
      initial_backoff_seconds: 5
      max_backoff_seconds: 30
      jitter: false
    on_retries_exhausted:
      action: fallback_skill
      fallback_skill: null             # null = return partial result with error
      notify: true
      alert_level: WARN

  - id: "EP-003"
    trigger:
      error_type: budget_exceeded
      skill: null
    recovery:
      level: 4
      max_retries: 0
    on_retries_exhausted:
      action: halt
      notify: true
      alert_level: CRITICAL
      message: "Budget ceiling reached. Execution halted. Partial results returned."
      partial_results: true            # return whatever was completed before halt

  - id: "EP-004"
    trigger:
      error_type: static_analysis_tool_missing
      skill: security-audit.md
    recovery:
      level: 3
      max_retries: 0
    on_retries_exhausted:
      action: degrade
      degraded_mode: llm-only-security-review
      notify: true
      alert_level: ERROR
      output_on_degrade:
        add_warning: true
        warning_message: "Semgrep/Bandit unavailable — LLM-only review. Deterministic checks NOT run. Do not deploy without re-running static analysis."

# ── Circuit Breaker ────────────────────────────────────────────────────────
circuit_breaker:
  enabled: true
  failure_threshold: 5               # open circuit after N consecutive failures
  success_threshold: 2               # close circuit after N consecutive successes
  half_open_timeout_seconds: 30      # probe interval when circuit is HALF-OPEN
  scoped_per_skill: true             # each skill has its own circuit

# ── Fallback Skill Chains ──────────────────────────────────────────────────
fallback_chains:
  rag-retrieval.md:
    - reasoning-only.md              # first fallback: LLM with no retrieval
    - escalate-to-human.md           # second fallback: HITL gate

  security-audit.md:
    - llm-only-security-review.md    # first fallback: LLM review, no tools
    - gate.md                        # second fallback: human security review

  code-review.md:
    - basic-lint-only.md             # first fallback: deterministic lint only

# ── Global Recovery ───────────────────────────────────────────────────────
global:
  max_total_retries_per_session: 20  # across all skills, hard ceiling
  partial_results_on_halt: true      # always return completed work even on halt
  write_error_to_memories: true      # log persistent patterns to MEMORIES.md
  memories_error_key: "recurring_failures"
```

---

## Execution Algorithm

```
SKILL INVOCATION FAILS
│
├── Classify error → Level 0/1/2/3/4
├── Find matching policy in policies[] (first match wins)
│
├── IF Level 0 or 1 (TRANSIENT/RETRYABLE):
│   ├── IF retries_remaining > 0:
│   │   ├── Calculate backoff: initial * (2^attempt) ± jitter
│   │   ├── Wait backoff duration
│   │   ├── Decrement retries_remaining
│   │   ├── Log: retry_attempt { skill, attempt, backoff_ms, error_type }
│   │   └── Re-invoke skill
│   └── IF retries_exhausted:
│       └── Proceed to on_retries_exhausted action
│
├── IF Level 2 (SKILL_FAIL):
│   ├── Check fallback_chains for this skill
│   ├── IF fallback chain exists:
│   │   ├── Log: fallback_invoked { original_skill, fallback_skill, reason }
│   │   └── Invoke next skill in fallback chain
│   └── IF no fallback: return error with partial_results
│
├── IF Level 3 (DEGRADED):
│   ├── Log: degraded_mode_activated { skill, reason, mode }
│   ├── Alert at ERROR level
│   ├── Execute degraded_mode variant
│   └── Attach warning to output
│
└── IF Level 4 (FATAL):
    ├── Log: fatal_error { skill, reason, session_id } at CRITICAL
    ├── Alert via pagerduty/slack
    ├── Write to MEMORIES.md: recurring_failures entry
    ├── IF partial_results_on_halt: collect + return completed work
    └── HALT — do not retry, do not degrade
```

---

## Circuit Breaker State Machine

```
CLOSED (normal operation)
  │  failure_threshold consecutive failures
  ▼
OPEN (all requests fail fast — no invocation)
  │  half_open_timeout_seconds elapsed
  ▼
HALF-OPEN (probe: allow one request through)
  │  success → success_threshold consecutive successes
  ▼
CLOSED (recovered)

HALF-OPEN → failure → OPEN (reset timeout)
```

When circuit is OPEN, the runner returns immediately:
```json
{ "error": "circuit_open", "skill": "rag-retrieval.md", "retry_after_seconds": 30 }
```

---

## MEMORIES.md Error Tracking Format

Persistent error patterns written after fatal or recurring failures:

```markdown
## recurring_failures

- skill: rag-retrieval.md
  error: vector_db_timeout
  occurrences: 7
  first_seen: 2025-05-04T10:00:00Z
  last_seen:  2025-05-04T18:44:00Z
  action_taken: degraded to reasoning-only
  recommendation: Check vector DB connection pool config. Timeout threshold may need raising.
```

---

## Output Schema (on any error resolution)

```json
{
  "original_error": "vector_db_timeout",
  "policy_applied": "EP-001",
  "recovery_action": "degrade",
  "retries_attempted": 3,
  "degraded_mode": "reasoning-only",
  "circuit_state": "CLOSED",
  "partial_result": { "...": "best available output" },
  "warnings": ["Vector DB unavailable — answer from LLM reasoning only."],
  "confidence_adjusted": 0.45,
  "alert_sent": true,
  "alert_level": "ERROR"
}
```

---

## Constraints
- Level 4 (FATAL) errors MUST halt execution — never retry or degrade
- Circuit breaker state MUST be persisted per-skill across session restarts
- partial_results_on_halt MUST always return completed work to avoid data loss
- Error events MUST be logged to audit trail at appropriate severity levels
- MEMORIES.md must record recurring failure patterns for cross-session learning
- Fallback skills MUST exist in .agents/skills/ — validate.sh enforces at build time

## References
- ./references/audit-trails.md    ← retry_attempt, fallback_invoked, degraded_mode, fatal_error events
- ./references/governance.md      ← Alert thresholds and escalation contacts
- ./MEMORIES.md                   ← Persistent error pattern storage
- ./.circuit-breaker/             ← Circuit breaker state files (auto-created by runner)

---

## Skill-Level on_fail Precedence (Added in v1.2.0)

Individual SKILL.md files can declare inline error handling via frontmatter keys.
When present, these keys override this ERROR_POLICY.md for that specific skill.

### Precedence Order

```
1. skill-level — Skill on_fail (SKILL.md frontmatter)   ← highest priority
2. ERROR_POLICY.md fallback_chains              ← applies if no on_fail set
3. ERROR_POLICY.md global policies              ← lowest priority
4. Circuit breaker                              ← always applies regardless
```

### Frontmatter Keys

```yaml
# In any SKILL.md frontmatter:
on_fail: reasoning-only.md       # Primary fallback skill when any error occurs
on_empty_result: hitl-gate       # Specific: invoked when result set is empty (RAG returns 0)
on_timeout: reasoning-only.md    # Specific: invoked when wall-clock limit exceeded
retry_count: 2                   # How many retries before invoking on_fail (default: 2)
```

### Key Semantics

**`on_fail`**: Invoked after `retry_count` retries are exhausted on any error type.
Corresponds to ERROR_POLICY Level 1 (RETRYABLE) and Level 2 (SKILL_FAIL) combined.
Does NOT override Level 4 (FATAL) — auth failures and kill switch still halt immediately.

**`on_empty_result`**: Invoked specifically when the skill returns a valid response
but the result set is empty (e.g., RAG retrieval finds 0 chunks, search returns 0 results,
database query returns 0 rows). This is distinct from an error — the skill succeeded
but found nothing. Separate from `on_fail` because the correct response to "found nothing"
often differs from the correct response to "tool crashed."

**`on_timeout`**: Invoked when the skill exceeds `item_timeout_seconds` (from SEQUENCE.md)
or the global wall-clock limit. Often the correct fallback differs from a crash fallback —
a timed-out RAG retrieval should degrade to reasoning-only, while a timed-out security
audit should escalate to HITL rather than silently degrade.

**`retry_count`**: Number of attempts before invoking `on_fail`. Each retry uses the
same backoff strategy as defined in the matching ERROR_POLICY policy (if one exists),
or defaults to exponential: 3s → 9s → 27s. Setting retry_count: 0 invokes on_fail
immediately on first failure with no retry.

### Missing Key Behavior

| Key present? | Behavior |
|---|---|
| `on_fail` set | Use on_fail target. ERROR_POLICY.md fallback_chain ignored for this skill. |
| `on_fail` absent | Use ERROR_POLICY.md fallback_chain for this skill. |
| `on_empty_result` set | Use on_empty_result for empty results, on_fail for errors. |
| `on_empty_result` absent | Use on_fail for both errors AND empty results. |
| `on_timeout` set | Use on_timeout for timeouts, on_fail for other errors. |
| `on_timeout` absent | Use on_fail for both timeouts AND other errors. |
| `retry_count` absent | Default: 2 retries before invoking on_fail. |

### validate.sh Checks

The package validator enforces:
- `on_fail` target must exist in .agents/skills/ OR be a reserved value
  (reasoning-only.md, hitl-gate, general-assistant)
- `on_empty_result` and `on_timeout` targets follow the same rule
- `retry_count` must be a non-negative integer (0–10)
- If on_fail is "hitl-gate" but GATE.md is not in the package: WARNING

### Reserved on_fail Values (no .md file required)

```
reasoning-only.md   → Degrade to LLM reasoning without RAG/tools
hitl-gate           → Pause and invoke GATE.md HITL checkpoint
general-assistant   → Fall back to unconstrained general LLM response
```
