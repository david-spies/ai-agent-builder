---
name: router
spec_version: 1.0.0
component_type: logic-gate
version: 1.0.0
description: Deterministic traffic controller that routes agent execution based on strict regex, JSON path, or keyword rules — evaluated before any LLM is invoked. Prevents probabilistic LLM drift on high-stakes routing decisions. Activates when agent output must be directed to a specific downstream skill based on verifiable data conditions.
routing_strategy: deterministic
evaluation_order: top-down-first-match
default_fallback: general-assistant
on_no_match: hitl-gate
generated: 2026-05-04
---

# Router — Deterministic Execution Controller
# Ai-Agent Builder · Logic Components
# Routes agent execution based on hard-coded rules, not LLM inference.

---

## Purpose

The Router is a **Traffic Controller**. It intercepts the output of a previous skill
or a user input and evaluates it against a predefined rule table before determining
which agent or skill to invoke next.

**Critical enterprise use case**: In security, finance, or compliance workflows, you
cannot leave "Route to Approval" vs "Route to Reject" to probabilistic LLM choice.
The Router makes that decision deterministically, then hands off to the LLM.

---

## Execution Rules

> Rules evaluated **top-down, first-match wins**. Order by specificity — most
> specific conditions first, broadest last.

| Priority | Match Condition | Logic Type | Target Skill | Notes |
|:---|:---|:---|:---|:---|
| 1 | `$.security_score < 0.5` | JSON_PATH | `security-audit.md` | Low confidence → mandatory audit |
| 2 | `$.severity == "CRITICAL"` | JSON_PATH | `incident-response.md` | Critical findings → incident flow |
| 3 | `^FIX-[\d]+\|^INC-[\d]+` | REGEX | `incident-response.md` | Ticket ID prefix → incident |
| 4 | `^(feat\|fix\|chore)\(.+\):` | REGEX | `code-review.md` | Conventional commit → code review |
| 5 | `["sprint","backlog","story"]` | KEYWORD_ANY | `sprint-planner.md` | Sprint keywords → planner |
| 6 | `["audit","cve","owasp","vuln"]` | KEYWORD_ANY | `security-audit.md` | Security keywords → audit |
| 7 | `\.(js\|ts\|py\|cpp)$` | REGEX | `code-review.md` | Code file extension → code review |
| 8 | `\.(pdf\|docx\|doc\|pptx)$` | REGEX | `rag-retrieval.md` | Document extension → RAG |
| 9 | `\.(csv\|json\|yaml)$` | REGEX | `data-validator.md` | Data file extension → validator |
| 10 | `.*` | REGEX | `{default_fallback}` | Catch-all → fallback skill |

---

## Evaluation Logic

The runner MUST implement the following sequence on receiving an input object:

```
1. INPUT SANITIZATION
   Convert input to standard JSON: { "raw": "...", "metadata": {}, "files": [] }

2. SEQUENTIAL EVALUATION
   For each rule in Execution Rules (top to bottom):

   a. JSON_PATH rules:
      - Parse input as JSON
      - Evaluate JSONPath expression against input object
      - If expression resolves to truthy value → MATCH

   b. REGEX rules:
      - Apply regex pattern against: input.raw (string) OR file names in input.files[]
      - Flags: case-insensitive, multiline
      - If pattern matches → MATCH

   c. KEYWORD_ANY rules:
      - Tokenize input.raw to lowercase words
      - If ANY keyword in the list is present → MATCH

3. ON MATCH
   - Halt evaluation immediately (do not evaluate remaining rules)
   - Log matched rule to audit trail: { rule_priority, logic_type, condition, target }
   - Pass FULL input payload to Target Skill unchanged

4. ON NO MATCH
   - Log: "No rule matched — routing to fallback"
   - Route to: default_fallback value
   - If default_fallback is "hitl-gate": invoke gate.md and await human input

5. AUDIT TRAIL ENTRY (required for every routing decision)
   {
     "event_type": "routing_decision",
     "rule_matched": 3,
     "condition": "^FIX-[\\d]+",
     "logic_type": "REGEX",
     "target": "incident-response.md",
     "input_hash": "<sha256 of sanitized input>",
     "deterministic": true
   }
```

---

## Input Schema

```json
{
  "raw": "string — raw user input or previous skill output",
  "metadata": {
    "session_id": "uuid",
    "previous_skill": "skill-name or null",
    "security_score": 0.0,
    "severity": "CRITICAL|HIGH|MEDIUM|LOW|null",
    "confidence": 0.0
  },
  "files": [
    { "name": "filename.ext", "size_bytes": 0, "category": "text|doc|code" }
  ]
}
```

## Output Schema

```json
{
  "routed_to": "target-skill.md",
  "rule_matched": 3,
  "rule_condition": "^FIX-[\\d]+",
  "logic_type": "REGEX",
  "deterministic": true,
  "fallback_used": false,
  "payload": { "...": "original input passed through unchanged" }
}
```

---

## Constraints
- Rules MUST be evaluated in declared priority order — no parallel evaluation
- The runner MUST NOT allow the LLM to override a routing decision
- Every routing event MUST produce an audit trail entry
- Target skills MUST exist in .agents/skills/ — validate.sh enforces this at build time
- JSON_PATH expressions follow RFC 9535 (jsonpath-plus compatible)
- REGEX patterns follow ECMAScript syntax (browser and Node.js compatible)

## References
- ./references/guardrails.md     ← Input sanitization before rule evaluation
- ./references/audit-trails.md   ← Required: log every routing decision
- ./routing-manifest.json        ← Compiled rule index for fast lookup
