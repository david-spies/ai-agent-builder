---
name: data-map
spec_version: 1.0.0
component_type: data-mapper
version: 1.0.0
description: Cross-skill data mapper that explicitly defines how the JSON output of one skill maps to the JSON input of the next skill. Eliminates the assumption that the LLM will "figure out" how to pass context between skills. Defines exact field-to-field mappings, type coercions, default values, and transformation expressions. Required when chaining skills where field names or schemas differ.
generated: 2026-05-04
---

# Data Map — Cross-Skill Data Mapper
# Ai-Agent Builder · Logic Components
# Explicit JSON field mapping between skill outputs and skill inputs.

---

## Purpose

When chaining skills, the agent currently relies on the LLM to "figure out" which
field from Skill A's output corresponds to which field in Skill B's input. This
produces subtle, hard-to-debug errors — the LLM might use `result.severity` when
the downstream skill expects `finding.risk_level`.

The Data Map component specifies **exact JSON path mappings** between skills,
optionally with transformation expressions. The runner wires these connections
mechanically — no LLM inference in the plumbing.

---

## Mapping Syntax

Each mapping entry defines:

```
source:      JSONPath into the OUTPUT of the source skill
target:      JSONPath into the INPUT of the destination skill
type:        Expected type after mapping (string|number|boolean|array|object)
transform:   Optional JS expression operating on `value` (the resolved source value)
default:     Value to use if source path resolves to null or undefined
required:    If true, mapping failure halts execution
```

---

## Example Maps

### Map 1: code-review → security-audit

```yaml
# DATA_MAP.md — code-review → security-audit
source_skill: code-review.md
target_skill: security-audit.md
mappings:
  - source:   "$.findings[?(@.severity=='CRITICAL' || @.severity=='HIGH')]"
    target:   "$.audit_input.flagged_findings"
    type:     array
    required: true

  - source:   "$.quality_score"
    target:   "$.audit_input.pre_review_score"
    type:     number
    required: false
    default:  0

  - source:   "$.files_reviewed"
    target:   "$.audit_input.scope.files"
    type:     array
    required: true

  - source:   "$.verdict"
    target:   "$.audit_input.prior_verdict"
    type:     string
    transform: "value.toLowerCase()"
    required: false
    default:  "unknown"
```

### Map 2: security-audit → gate (HITL before deploy)

```yaml
source_skill: security-audit.md
target_skill: gate.md
mappings:
  - source:   "$.security_posture_score"
    target:   "$.proposed_action.metadata.security_score"
    type:     number
    required: true

  - source:   "$.block_deployment"
    target:   "$.proposed_action.metadata.blocked"
    type:     boolean
    required: true

  - source:   "$.executive_summary"
    target:   "$.context_summary"
    type:     string
    required: true

  - source:   "$.findings[?(@.severity=='CRITICAL')]"
    target:   "$.proposed_action.metadata.critical_findings"
    type:     array
    default:  []
    required: false
```

### Map 3: sequence result → data-validator

```yaml
source_skill: sequence.md
target_skill: data-validator.md
mappings:
  - source:   "$.results[*].output"
    target:   "$.pipeline_outputs"
    type:     array
    required: true

  - source:   "$.items_failed"
    target:   "$.validation_context.prior_failures"
    type:     number
    default:  0
    required: false

  - source:   "$.batch_id"
    target:   "$.pipeline_name"
    type:     string
    transform: "'batch-' + value"
    required: true
```

---

## Full Schema

```json
{
  "map_id": "uuid",
  "source_skill": "skill-name.md",
  "target_skill": "skill-name.md",
  "version": "1.0.0",
  "description": "Human-readable purpose of this mapping",
  "mappings": [
    {
      "source": "$.json.path.expression",
      "target": "$.json.path.expression",
      "type": "string|number|boolean|array|object",
      "transform": "optional JS expression — variable: `value`",
      "default": "any",
      "required": true,
      "notes": "optional human annotation"
    }
  ],
  "pre_transform": "optional JS expression applied to entire source output before field mapping",
  "post_transform": "optional JS expression applied to entire target input after field mapping",
  "on_mapping_error": "halt|skip|use_default"
}
```

---

## Execution Algorithm

```
DATA MAPPING INVOKED (between source skill completion and target skill start)
│
├── Resolve source output: the JSON result from source_skill
│
├── FOR EACH mapping in mappings[]:
│   │
│   ├── Evaluate source JSONPath against source output
│   │   → value = jsonpath(source_output, mapping.source)
│   │
│   ├── IF value is null/undefined:
│   │   ├── IF mapping.default defined → value = mapping.default
│   │   ├── IF mapping.required == true AND no default → HALT with MappingError
│   │   └── IF mapping.required == false AND no default → skip this field
│   │
│   ├── IF mapping.transform defined:
│   │   └── value = eval_safe(mapping.transform, { value })
│   │       (eval_safe: only allows pure expressions, no I/O, no fetch)
│   │
│   ├── Coerce value to mapping.type
│   │   → type errors halt if required, skip if not required
│   │
│   └── Set target JSONPath in target_input: jsonpath_set(target_input, mapping.target, value)
│
├── IF post_transform defined:
│   └── target_input = eval_safe(post_transform, { target_input })
│
├── Log: data_mapped {
│     map_id, source_skill, target_skill,
│     fields_mapped, fields_skipped, fields_defaulted
│   }
│
└── Pass target_input to target_skill as its input
```

---

## Transform Expression Safety Rules

`transform` expressions are evaluated in a sandboxed context. The following are
permitted and prohibited:

```
PERMITTED:
  - String methods:    value.toLowerCase(), value.trim(), value.slice(0,10)
  - Number math:       value * 100, Math.round(value), value > 0 ? value : 0
  - Array operations:  value.filter(x => x.severity === 'CRITICAL')
  - Object spread:     { ...value, extra_field: true }
  - Ternary:           value ? value : 'default'
  - Template literals: `batch-${value}`

PROHIBITED (throw TransformSandboxError):
  - fetch(), XMLHttpRequest, require(), import
  - process, global, window, document
  - eval(), Function(), setTimeout(), setInterval()
  - File system access of any kind
```

---

## Output Schema

```json
{
  "map_id": "uuid",
  "source_skill": "code-review.md",
  "target_skill": "security-audit.md",
  "status": "success|partial|failed",
  "fields_mapped": 4,
  "fields_skipped": 1,
  "fields_defaulted": 1,
  "errors": [],
  "target_input": { "...": "fully mapped input ready for target skill" }
}
```

---

## Constraints
- JSONPath expressions MUST follow RFC 9535 syntax
- Transform expressions MUST be pure functions — no side effects, no I/O
- The runner MUST validate all target paths exist in the target skill's input schema
- Mapping failures on required fields MUST halt execution and log a MappingError audit event
- DATA_MAP.md files are named: `{source-skill}--to--{target-skill}.map.md`
- validate.sh MUST verify both source and target skills exist before build completes

## References
- ./references/audit-trails.md    ← data_mapped events
- ./routing-manifest.json         ← Registry of all active DATA_MAP files
