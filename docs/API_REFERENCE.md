# API_REFERENCE.md — Complete Configuration & API Reference
# Ai-Agent Builder · Documentation

version: 1.0.0
generated: 2026-05-04

---

## Table of Contents

1. [SKILL.md Field Reference](#skillmd-field-reference)
2. [AGENTS.md Field Reference](#agentsmd-field-reference)
3. [Guardrails Configuration Reference](#guardrails-configuration-reference)
4. [LLM Judge Configuration Reference](#llm-judge-configuration-reference)
5. [Permissions Scope Reference](#permissions-scope-reference)
6. [Audit Event Type Reference](#audit-event-type-reference)
7. [Builder JavaScript API](#builder-javascript-api)
8. [Python SDK Patterns](#python-sdk-patterns)
9. [Environment Variable Reference](#environment-variable-reference)
10. [Error Codes Reference](#error-codes-reference)

---

## SKILL.md Field Reference

### YAML Frontmatter Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `name` | string | ✓ | — | Kebab-case identifier. Must be unique in `.agents/skills/`. Used as discovery key. |
| `version` | string | ✓ | — | Semantic version (MAJOR.MINOR.PATCH). Bumped on any change that affects behavior. |
| `description` | string | ✓ | — | **Most important field.** 1–2 sentences. Verb-first. Keyword-rich. Used by discovery prompt to activate skill. Max 280 chars. |
| `template` | string | ✓ | — | One of: `react`, `supervisor`, `rag`, `security`, `swarm`, `custom` |
| `model` | string | — | `anthropic/claude-sonnet-4` | LLM model for this skill's worker agent. |
| `max_tokens` | integer | — | `4096` | Maximum output tokens per call. Range: 256–32768. |
| `temperature` | float | — | `0.1` | Sampling temperature. Range: 0.0–2.0. Use 0.0–0.2 for factual tasks, 0.7–1.0 for creative. |
| `memory` | string | — | `stateful-graph` | Memory strategy. One of: `stateful-graph`, `thread-history`, `vector-db-long-term`, `redis-session`, `none` |
| `scope` | string | — | `read_only` | Permission scope. One of: `read_only`, `read_write`, `elevated`, `admin`. Always start with minimum. |
| `framework` | string | — | `MCP (Model Context Protocol)` | Tool invocation framework. |
| `max_lines` | integer | — | `200` | Enforced line limit for this SKILL.md. Move excess to `./references/`. |
| `load` | string | — | `immediate` | `immediate` = load on skill activation. `on-demand` = load only when requested. |
| `generated` | string | — | — | ISO-8601 date when file was generated. Used for staleness tracking. |

### Required Markdown Sections

| Section | Required | Purpose |
|---|---|---|
| `# Overview` | ✓ | 2–3 sentence expansion of `description:`. Read by discovery prompt alongside frontmatter. |
| `## Instructions` | ✓ | Numbered, affirmative steps the agent follows exactly. |
| `## Constraints` | ✓ | Hard limits. Always include: no-hallucination rule, file-precedence rule, max-lines rule. |
| `## Output Format` | ✓ | JSON schema for the skill's output. Must be valid JSON. |
| `## References` | — | List of `./references/*.md` files to load on-demand. |

### Validation Rules

```
name:        required · kebab-case · unique per .agents/skills/
version:     required · must match /^\d+\.\d+\.\d+$/
description: required · 20–280 characters · verb-first
template:    required · must be one of the 6 valid templates
max_lines:   file must not exceed this value (enforced by validate.sh)
scope:       default read_only if omitted — never default to admin
```

---

## AGENTS.md Field Reference

### Top-Level Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `orchestrator` | string | ✓ | Name of the root orchestration agent (matches SKILL.md `name:`) |
| `pattern` | string | ✓ | Human-readable pattern description (e.g. "Hierarchical Multi-Agent System") |
| `memory` | string | ✓ | Path to memory file, typically `MEMORIES.md` |
| `version` | string | ✓ | Semver — must match SKILL.md version |
| `generated` | string | — | ISO-8601 generation date |

### Agent Role Definition Fields

Each role in `## Agent Roles` should document:

| Field | Description |
|---|---|
| `Model` | Which LLM model this role uses |
| `Config` | Path to this role's `INSTRUCTIONS.md` |
| `Responsibility` | What this agent does (1–2 sentences) |
| `Input` | What it receives to start work |
| `Output` | What it produces when done |
| `Veto Power` | Whether this agent can block other agents' outputs |
| `Tools` | Specific tools or APIs this role has access to |

### Working Agreements

Every AGENTS.md must define Working Agreements — non-negotiable rules all agents follow:

```markdown
## Working Agreements

1. [Governance rule — e.g. Security Officer has veto power]
2. [Memory rule — e.g. MEMORIES.md updated every session]
3. [HITL rule — which actions require human approval]
4. [Cost rule — max tool calls, budget ceiling]
5. [Audit rule — all events logged, append-only]
6. [Quality rule — LLM Judge threshold]
```

---

## Guardrails Configuration Reference

### Layer 1: Input Guardrails

| Config Key | Type | Default | Description |
|---|---|---|---|
| `prompt_injection_detection` | bool | `true` | Enable/disable injection pattern matching |
| `pii_masking` | bool | `true` | Enable/disable PII redaction before LLM |
| `pii_entities` | list | see below | PII types to detect and redact |
| `max_prompt_tokens` | int | `8192` | Hard limit on input size |
| `max_user_message_length` | int | `32768` | Character limit on user message |
| `rate_limit_requests_per_minute` | int | `60` | Per-session request rate limit |

**Default PII entities detected:**
`EMAIL_ADDRESS`, `US_SSN`, `CREDIT_CARD`, `PHONE_NUMBER`, `AWS_ACCESS_KEY`, `GITHUB_TOKEN`, `PRIVATE_KEY`, `IP_ADDRESS`

**Injection patterns detected** (always enabled, not configurable):
```
"ignore all previous instructions"
"ignore your system prompt"
"pretend you are / act as if"
"reveal / output / print your instructions"
"DAN" / "jailbreak" / "developer mode"
Base64 encoded instruction sequences
Unicode homoglyph substitutions
```

### Layer 2: Execution Guardrails

| Config Key | Type | Default | Description |
|---|---|---|---|
| `sandbox_runtime` | string | `docker` | `docker`, `gvisor`, `none` (never use none in prod) |
| `network_access` | string | `blocked` | `blocked`, `allowlist`, `open` (never use open in prod) |
| `network_allowlist` | list | `[]` | Domains permitted for network access |
| `semgrep_enabled` | bool | `true` | Run Semgrep static analysis on generated code |
| `semgrep_rulesets` | list | see below | Semgrep rulesets to apply |
| `bandit_enabled` | bool | `true` | Run Bandit Python security linter |
| `bandit_severity_threshold` | string | `MEDIUM` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `detect_secrets_enabled` | bool | `true` | Run detect-secrets credential scanner |
| `detect_secrets_plugins` | list | all | Specific plugins to enable |
| `memory_limit_mb` | int | `512` | Container memory limit |
| `cpu_limit` | float | `0.5` | Container CPU limit (cores) |
| `timeout_seconds` | int | `30` | Per-tool-call timeout |

**Default Semgrep rulesets:**
`p/owasp-top-ten`, `p/python-security`, `p/javascript-security`, `p/secrets`, `p/sql-injection`, `p/xss`

**Blocked commands** (always enforced):
`rm -rf`, `dd if=`, `mkfs`, `sudo`, `chmod 777`, `curl | bash`, `wget | sh`, `eval`, `exec`

### Layer 3: Output Guardrails

| Config Key | Type | Default | Description |
|---|---|---|---|
| `dlp_scan_enabled` | bool | `true` | Scan final output for secrets and PII |
| `hallucination_check_enabled` | bool | `true` | Check for placeholder URLs and fake libraries |
| `max_output_tokens` | int | `4096` | Hard limit on response size |
| `hitl_triggers` | list | see below | Conditions that pause execution for human approval |

**Default HITL triggers:**
- `action_type: file_delete`
- `action_type: external_api_write`
- `action_type: permission_scope_change`
- `action_type: database_destructive`
- `action_type: payment_initiation`
- `cost_consumed_pct >= 80`
- `revision_cycle_count >= 3`
- `guardrail_block_count >= 5`

### Cost Controls

| Config Key | Type | Default | Description |
|---|---|---|---|
| `max_tool_calls_per_run` | int | `50` | Hard stop — agent halts and summarizes |
| `max_wall_clock_seconds` | int | `120` | Timeout — returns partial result with status |
| `budget_ceiling_usd` | float | `0.50` | Pause and confirm before exceeding |
| `max_llm_calls_per_run` | int | `20` | Maximum LLM API calls in one agent run |
| `max_input_tokens_per_call` | int | `8192` | Per-call input token limit |
| `max_output_tokens_per_call` | int | `4096` | Per-call output token limit |

---

## LLM Judge Configuration Reference

### Judge Config Fields

| Field | Type | Default | Description |
|---|---|---|---|
| `judge_model` | string | `anthropic/claude-opus-4` | Always use a higher-capability model than the worker |
| `response_format` | string | `json_object` | Must be `json_object` for automated pipeline use |
| `pass_threshold` | object | see below | Minimum scores required for Pass verdict |
| `on_fail` | string | `feed_back_to_reflection_loop` | What happens when Judge returns Fail |
| `block_deployment_on_security_fail` | bool | `true` | Any security score < 4 blocks deployment |
| `max_reflection_cycles` | int | `2` | Max times agent can retry after Judge Fail before HITL |

### Pass Threshold Object

```json
{
  "correctness_minimum": 4,
  "security_minimum": 4,
  "maintainability_minimum": 4,
  "efficiency_minimum": 4,
  "weighted_average_minimum": 4.0
}
```

### Scoring Rubric Summary

| Criterion | Score 5 | Score 4 | Score 3 | Score 1–2 |
|---|---|---|---|---|
| **Correctness** | Perfect, all requirements met | Minor gap, functionally correct | Partial — significant gaps | Wrong or off-topic |
| **Security** | Exemplary, proactive best practices | No exploitable vulns, minor style | Potential concern, no immediate exploit | Exploitable vuln or hardcoded secret |
| **Maintainability** | Reference implementation quality | Good, minor cleanup needed | Functional but hard to maintain | Unreadable or anti-pattern heavy |
| **Efficiency** | Optimal approach | Slightly verbose, acceptable | Notable inefficiency | Grossly inefficient |

---

## Permissions Scope Reference

### Scope Hierarchy

```
read_only (level 0)
  └── read_write (level 1)
        └── elevated (level 2)
              └── admin (level 3) — HITL required for ALL actions
```

### Tool Permission Matrix

| Tool Action | read_only | read_write | elevated | admin |
|---|:---:|:---:|:---:|:---:|
| `file:read` | ✓ | ✓ | ✓ | ✓ |
| `file:write:/tmp` | ✗ | ✓ | ✓ | ✓ |
| `file:write:workspace` | ✗ | HITL | ✓ | HITL |
| `file:delete` | ✗ | ✗ | ✗ | HITL |
| `web:search` | ✓ | ✓ | ✓ | ✓ |
| `web:fetch:GET` | ✓ | ✓ | ✓ | ✓ |
| `web:fetch:POST` | ✗ | HITL | ✓ | HITL |
| `code:lint` | ✓ | ✓ | ✓ | ✓ |
| `code:execute` | ✗ | ✗ | HITL | HITL |
| `vector_db:query` | ✓ | ✓ | ✓ | ✓ |
| `vector_db:write` | ✗ | ✓ | ✓ | ✓ |
| `db:select` | ✗ | ✓ | ✓ | ✓ |
| `db:insert` | ✗ | HITL | HITL | HITL |
| `db:delete` | ✗ | ✗ | ✗ | HITL |
| `db:schema_change` | ✗ | ✗ | ✗ | HITL |
| `secrets:read` | ✗ | ✗ | ✓ (vault) | ✓ |
| `secrets:write` | ✗ | ✗ | ✗ | HITL |
| `api:read` | ✗ | ✓ | ✓ | ✓ |
| `api:write` | ✗ | HITL | HITL | HITL |
| `permission:change` | ✗ | ✗ | ✗ | HITL ×2 |

**Legend:** ✓ = allowed · ✗ = denied · HITL = requires human approval

---

## Audit Event Type Reference

### Complete Event Type List

| Event Type | Actor | Severity | Description |
|---|---|---|---|
| `session_start` | system | INFO | Agent session initialized |
| `session_end` | system | INFO | Session complete, MEMORIES.md updated |
| `skill_discovery` | orchestrator | INFO | Discovery prompt executed, skill selected |
| `skill_loaded` | orchestrator | INFO | Full SKILL.md loaded into context |
| `tool_call` | any agent | INFO | External tool invoked via MCP |
| `tool_call_failed` | any agent | WARN | Tool call returned error |
| `decision` | any agent | INFO | Agent made planning or routing decision |
| `guardrail_block` | guardrail_layer | CRITICAL | Guardrail intercepted and blocked action |
| `guardrail_warn` | guardrail_layer | WARN | Guardrail issued warning, action allowed |
| `pii_redacted` | guardrail_layer | INFO | PII detected and redacted from input |
| `injection_attempt` | guardrail_layer | CRITICAL | Prompt injection attempt detected |
| `hitl_pause` | system | WARN | HITL checkpoint triggered |
| `hitl_approved` | hitl_operator | INFO | HITL operator approved action |
| `hitl_rejected` | hitl_operator | WARN | HITL operator rejected action |
| `hitl_timeout` | system | WARN | HITL approval timed out (auto-rejected) |
| `eval_result` | llm_judge | INFO | LLM Judge evaluation completed |
| `eval_fail` | llm_judge | WARN | LLM Judge returned Fail verdict |
| `revision_cycle` | security_officer | WARN | Security Officer returned to Developer |
| `file_generated` | developer_worker | INFO | Output .md file generated |
| `package_assembled` | orchestrator | INFO | All files packaged for download |
| `version_rollback` | system | WARN | Package rolled back to previous version |
| `budget_warning` | system | WARN | Cost approaching ceiling (> 80%) |
| `budget_exceeded` | system | ERROR | Cost ceiling hit — execution paused |
| `timeout` | system | ERROR | Wall-clock timeout reached |
| `error` | system | ERROR | Unhandled exception |
| `session_suspended` | system | CRITICAL | Kill switch activated |

### Severity Levels

| Level | When to Use | Alerting |
|---|---|---|
| `INFO` | Normal operation, successful actions | Log only |
| `WARN` | Unexpected but handled situations | Log + track count |
| `ERROR` | Failures that impact agent output | Log + Slack alert |
| `CRITICAL` | Security events, data breaches, kill switch | Log + PagerDuty |

---

## Builder JavaScript API

The builder application exposes these functions — useful for extending or embedding the tool.

### State Management

```javascript
// Access application state
const S = window.S;  // Not exposed globally — internal only

// Agent management
createNewAgent()                    // Add new agent to sidebar
activateAgent(id: string)           // Switch active agent
loadAgent(el: HTMLElement, name: string)

// Field updates
onNameChange(value: string)         // Update agent name, sync all displays
onUseCaseChange(value: string)      // Update use case, trigger skill auto-detection
quickFill(key: string)              // Fill use case from template key
```

### Template System

```javascript
// Template keys: 'react', 'supervisor', 'rag', 'security', 'swarm', 'custom'
selectTemplate(id: string)           // Select template, update pipeline + preview
renderPipeline(id: string)           // Render 6-node pipeline for template

// TEMPLATES object structure
TEMPLATES[id] = {
  name: string,
  pattern: string,
  overview: string,
  instructions: string[],
  roles: string,
  pipelineNodes: string[]           // Always exactly 6 nodes
}
```

### File Operations

```javascript
// Drag-and-drop handlers
dzOver(event: DragEvent)
dzLeave()
dzDrop(event: DragEvent)

// File management
handleFiles(files: FileList)
removeFile(name: string)
addSkillTagFromFile(name: string)

// Download
downloadPackage()                    // Generate and download all 6 output files
downloadSingle(filename, codeId)     // Download a single displayed code block
downloadText(filename, content)      // Core download function (Blob API)
```

### Build Engine

```javascript
doBuild()                            // Start build — validates first, then runs 12-step process
doValidate()                         // Run validation report modal
finishBuild(name: string)            // Called after all steps complete
downloadPackage()                    // Assemble and trigger downloads
```

### UI Functions

```javascript
notify(msg: string, isError?: bool)  // Show notification toast (auto-dismisses 2.8s)
showModal(title, sub, body, showDl?, onOk?, showOk?)  // Open modal dialog
closeModal()                         // Close modal
switchTab(el: HTMLElement, id: string)  // Switch right panel tab
switchView(view: string)             // Switch sidebar workspace view
copyCode(codeBlockId: string)        // Copy code block to clipboard
log(msg: string, level?: string)     // Add entry to audit log panel
```

### Build Steps

The 12 build steps (in order):

```javascript
const BUILD_STEPS = [
  'Scanning reference files via discovery prompt',
  'Generating SKILL.md frontmatter + overview',
  'Building AGENTS.md city-map orchestration',
  'Compiling guardrails input/execution/output layers',
  'Generating LLM-as-Judge rubric config',
  'Writing audit-trails schema and event types',
  'Creating governance and permissions policies',
  'Assembling versioning manifest and changelogs',
  'Running deterministic eval framework setup',
  'Building MEMORIES.md session persistence layer',
  'Red-team adversarial eval set generation',
  'Packaging deployment bundle',
];
```

### Quick Fill Keys

| Key | Fills use-case with |
|---|---|
| `'code-review'` | PR security and quality review use case |
| `'security-audit'` | Full codebase security audit use case |
| `'sprint-plan'` | Agile sprint planning use case |
| `'data-pipeline'` | Data pipeline monitoring use case |
| `'rag-agent'` | Knowledge base Q&A use case |
| `'code-gen'` | Code generation from spec use case |
| `'incident'` | Incident triage and response use case |
| `'custom'` | Empty (user types their own) |

---

## Python SDK Patterns

### Minimal Agent Runner

```python
"""Minimal pattern for running a SKILL.md-governed agent."""
import anthropic
from pathlib import Path

def run_skill(skill_path: str, user_request: str, **kwargs) -> str:
    client = anthropic.Anthropic()
    skill = Path(skill_path).read_text()

    # Load on-demand references mentioned in ## References section
    refs = []
    skill_dir = Path(skill_path).parent
    for line in skill.split('\n'):
        if line.strip().startswith('- ./references/'):
            ref_file = line.strip()[2:]  # strip '- '
            full_path = skill_dir / ref_file.replace('./', '')
            if full_path.exists():
                refs.append(f"\n\n---\n## {full_path.name}\n{full_path.read_text()}")

    system = skill + ''.join(refs)
    response = client.messages.create(
        model=kwargs.get('model', 'claude-sonnet-4-20250514'),
        max_tokens=kwargs.get('max_tokens', 4096),
        system=system,
        messages=[{'role': 'user', 'content': user_request}]
    )
    return response.content[0].text
```

### With Guardrails

```python
"""Pattern with input/output guardrail layers."""
import re, json
from pathlib import Path

# ── Input guardrails ───────────────────────────────────────────────────────
INJECTION_PATTERNS = [
    r'ignore all previous instructions',
    r'ignore your system prompt',
    r'pretend you are',
    r'reveal.*instructions',
    r'DAN\b',
]
PII_PATTERNS = {
    r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b': '[REDACTED:EMAIL]',
    r'\b\d{3}-\d{2}-\d{4}\b':                                  '[REDACTED:SSN]',
    r'AKIA[0-9A-Z]{16}':                                        '[REDACTED:AWS_KEY]',
    r'gh[pousr]_[A-Za-z0-9_]{36,}':                            '[REDACTED:GH_TOKEN]',
}

def input_guardrail(text: str) -> str:
    """Apply input guardrails. Returns sanitized text or raises."""
    lower = text.lower()
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, lower):
            raise ValueError(f'Prompt injection detected: {pattern}')
    for pattern, replacement in PII_PATTERNS.items():
        text = re.sub(pattern, replacement, text)
    return text

# ── Output guardrails ─────────────────────────────────────────────────────
SECRET_PATTERNS = [
    r'AKIA[0-9A-Z]{16}',          # AWS access key
    r'gh[pousr]_[A-Za-z0-9_]{36}', # GitHub token
    r'-----BEGIN.*PRIVATE KEY-----', # Private key
]
PLACEHOLDER_PATTERNS = [
    r'YOUR_[A-Z_]+', r'INSERT_[A-Z_]+', r'REPLACE_WITH_',
]

def output_guardrail(text: str) -> dict:
    """Scan output for secrets and placeholders. Returns status dict."""
    warnings = []
    for pattern in SECRET_PATTERNS:
        if re.search(pattern, text):
            return {'status': 'blocked', 'reason': f'Secret detected: {pattern}'}
    for pattern in PLACEHOLDER_PATTERNS:
        if re.search(pattern, text):
            warnings.append(f'Placeholder found: {pattern}')
    return {'status': 'approved', 'warnings': warnings, 'output': text}

# ── Full pipeline ─────────────────────────────────────────────────────────
def safe_run_skill(skill_path: str, user_request: str) -> dict:
    try:
        clean_input = input_guardrail(user_request)
    except ValueError as e:
        return {'status': 'blocked', 'layer': 'input', 'reason': str(e)}

    raw_output = run_skill(skill_path, clean_input)
    result = output_guardrail(raw_output)
    return result
```

### With Audit Logging

```python
"""Pattern adding structured audit trail to every agent call."""
import uuid, time, json
from datetime import datetime, timezone

class AuditedSkillRunner:
    def __init__(self, skill_path: str, agent_name: str):
        self.skill_path = skill_path
        self.agent_name = agent_name
        self.session_id = str(uuid.uuid4())
        self.log_file = f'audit-{self.session_id}.jsonl'
        self.sequence = 0
        self.start_time = time.time()
        self._log('session_start', 'system', f'Session initialized. Skill: {skill_path}')

    def run(self, user_request: str) -> dict:
        audit_id = self._log('tool_call', 'orchestrator', f'Running skill: {self.skill_path}')
        try:
            clean = input_guardrail(user_request)
        except ValueError as e:
            self._log('guardrail_block', 'guardrail_layer',
                      str(e), severity='CRITICAL',
                      guardrail_triggered=True, guardrail_layer='input',
                      verdict='blocked', parent_audit_id=audit_id)
            return {'status': 'blocked', 'reason': str(e)}

        output = run_skill(self.skill_path, clean)
        result = output_guardrail(output)

        if result['status'] == 'blocked':
            self._log('guardrail_block', 'guardrail_layer',
                      result['reason'], severity='CRITICAL',
                      guardrail_triggered=True, guardrail_layer='output',
                      verdict='blocked', parent_audit_id=audit_id)
        else:
            self._log('eval_result', 'llm_judge',
                      'Output approved by output guardrail',
                      verdict='approved', parent_audit_id=audit_id)

        return result

    def close(self):
        self._log('session_end', 'system', 'Session complete.')

    def _log(self, event_type, actor, action, severity='INFO',
             parent_audit_id=None, **kwargs) -> str:
        self.sequence += 1
        audit_id = str(uuid.uuid4())
        event = {
            'audit_id': audit_id,
            'session_id': self.session_id,
            'parent_audit_id': parent_audit_id,
            'sequence_number': self.sequence,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'elapsed_ms': int((time.time() - self.start_time) * 1000),
            'agent_name': self.agent_name,
            'event_type': event_type,
            'actor': actor,
            'action': action,
            'severity': severity,
            **kwargs
        }
        with open(self.log_file, 'a') as f:
            f.write(json.dumps(event) + '\n')
        return audit_id
```

---

## Environment Variable Reference

### Complete Variable List

| Variable | Required | Scope | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | ✓ | all | Anthropic API key. Never hardcode. |
| `OPENAI_API_KEY` | optional | all | OpenAI API key (alternative provider) |
| `GOOGLE_API_KEY` | optional | all | Google AI API key (alternative provider) |
| `WORKSPACE_ROOT` | ✓ (read_write+) | read_write, elevated, admin | Absolute path to agent workspace |
| `AUDIT_LOG_PATH` | — | all | Local audit log file path. Default: `./audit-{session_id}.jsonl` |
| `AUDIT_LOG_ENDPOINT` | — | all | SIEM streaming endpoint URL |
| `SLACK_WEBHOOK_URL` | — | all | Slack webhook for HITL and alert notifications |
| `PAGERDUTY_KEY` | — | elevated, admin | PagerDuty API key for P0/P1 incident paging |
| `VAULT_ADDR` | ✓ (elevated+) | elevated, admin | HashiCorp Vault or AWS Secrets Manager URL |
| `VAULT_TOKEN` | ✓ (elevated+) | elevated, admin | Vault auth token (or use `VAULT_ROLE_ARN` for IAM) |
| `VAULT_ROLE_ARN` | — | elevated, admin | AWS IAM role ARN for Vault auth (alternative to token) |
| `SANDBOX_RUNTIME` | — | elevated, admin | `docker` or `gvisor`. Default: `docker` |
| `DATADOG_API_KEY` | — | all | Datadog API key for metrics streaming |
| `STAGING_DEPLOY_PATH` | — | CI/CD | Staging deployment target path |
| `ADMIN_APPROVAL_WEBHOOK` | ✓ (admin) | admin | Dual-approval endpoint for admin-scope actions |
| `AUDIT_IMMUTABLE_STORE` | ✓ (admin) | admin | S3 Object Lock URL or equivalent for immutable audit |
| `AGENT_KILL_SWITCH` | — | all | Set to `true` to immediately suspend all agent operations |

### .env Template

```bash
# ── Required ──────────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-api03-...

# ── Workspace ─────────────────────────────────────────────────────────────────
WORKSPACE_ROOT=/absolute/path/to/workspace

# ── Audit & Observability ─────────────────────────────────────────────────────
AUDIT_LOG_PATH=./logs/audit.jsonl
AUDIT_LOG_ENDPOINT=                 # SIEM endpoint (optional)
DATADOG_API_KEY=                    # Metrics (optional)

# ── Notifications ─────────────────────────────────────────────────────────────
SLACK_WEBHOOK_URL=                  # HITL and alerts (optional)
PAGERDUTY_KEY=                      # P0/P1 incidents (optional)

# ── Secrets Management (required for elevated+ scope) ─────────────────────────
VAULT_ADDR=https://vault.your-org.com
VAULT_TOKEN=hvs.XXXXXXXX            # OR use VAULT_ROLE_ARN

# ── Sandbox (required for code execution) ─────────────────────────────────────
SANDBOX_RUNTIME=docker

# ── Emergency ─────────────────────────────────────────────────────────────────
AGENT_KILL_SWITCH=false             # Set true to suspend all agents immediately
```

---

## Error Codes Reference

### Guardrail Error Codes

| Code | Layer | Description | User-Facing Message |
|---|---|---|---|
| `GUARD-I-001` | Input | Prompt injection detected | "Request contains patterns that are not permitted." |
| `GUARD-I-002` | Input | PII detected and redacted | "Sensitive data was automatically redacted from your request." |
| `GUARD-I-003` | Input | Token limit exceeded | "Request too long. Please shorten your input." |
| `GUARD-I-004` | Input | Rate limit hit | "Too many requests. Please wait before retrying." |
| `GUARD-E-001` | Execution | Semgrep blocking pattern | "Generated code failed security analysis: {rule_id}" |
| `GUARD-E-002` | Execution | Bandit HIGH/CRITICAL | "Generated code contains a security vulnerability: {test_id}" |
| `GUARD-E-003` | Execution | Secret detected (detect-secrets) | "Generated code contains a potential credential. Use environment variables." |
| `GUARD-E-004` | Execution | Blocked command | "Command '{cmd}' is not permitted in this environment." |
| `GUARD-E-005` | Execution | Network blocked | "Network access to '{host}' is not in the allowlist." |
| `GUARD-E-006` | Execution | Filesystem blocked | "Access to '{path}' is not permitted." |
| `GUARD-E-007` | Execution | Sandbox timeout | "Execution timed out after {n} seconds." |
| `GUARD-O-001` | Output | Secret in output | "Output contains a potential credential and was blocked." |
| `GUARD-O-002` | Output | DLP: PII in output | "Output contains personal information and was redacted." |
| `GUARD-O-003` | Output | Hallucinated URL | "Output contains a suspicious URL. Verify before using." |

### Eval Error Codes (eval-runner.py exit codes)

| Exit Code | Meaning | Action |
|---|---|---|
| `0` | All scenarios passed | Approve for deployment |
| `1` | Some scenarios failed (non-critical) | Review `eval-results.json` before deploying |
| `2` | CRITICAL security finding — deployment blocked | Fix security issues, re-run eval |
| `3` | Regression vs baseline detected | Review regression report, fix or accept |
| `4` | Red team probe passed (agent was vulnerable) | Fix vulnerability before any deployment |

### Package Builder Exit Codes (package.sh)

| Exit Code | Meaning |
|---|---|
| `0` | Package built and deployed successfully |
| `1` | Validation or eval failure |
| `2` | CRITICAL eval finding — deployment blocked |
| `3` | Regression — blocked for production |

### HTTP Status Codes (if API-deployed)

| Status | Meaning |
|---|---|
| `200` | Agent completed successfully |
| `400` | Invalid request (missing required fields) |
| `403` | Permission denied (scope too low for requested action) |
| `422` | Guardrail block (input or output rejected) |
| `429` | Rate limit exceeded |
| `500` | Agent error (unhandled exception) |
| `503` | Agent suspended (kill switch active) |
| `504` | Agent timeout (wall-clock limit exceeded) |

---

## on_fail Frontmatter Reference (Added in v1.2.0)

### Overview

Skill-level inline error handling. When present in SKILL.md frontmatter, these keys
override `ERROR_POLICY.md` for that specific skill only. All other skills continue
to use `ERROR_POLICY.md` as their error governance.

**Precedence rule**: `on_fail` (skill) → `ERROR_POLICY.md fallback_chains` → `ERROR_POLICY.md global` → circuit breaker

### Frontmatter Fields

| Field | Type | Default | Description |
|---|---|---|---|
| `on_fail` | string | — (use ERROR_POLICY.md) | Primary fallback skill invoked after `retry_count` retries exhausted on any error |
| `on_empty_result` | string | same as on_fail | Fallback invoked when skill succeeds but returns zero results |
| `on_timeout` | string | same as on_fail | Fallback invoked when wall-clock limit is exceeded |
| `retry_count` | integer | `2` | Number of retries before invoking `on_fail`. Range: 0–10. |

### Valid `on_fail` Values

```
reasoning-only.md         Reserved — degrade to LLM reasoning without RAG/tools
hitl-gate                 Reserved — invoke GATE.md HITL checkpoint
general-assistant         Reserved — fall back to unconstrained general LLM response
<skill-name>.md           Any .md file in .agents/skills/ directory
```

### Example Configurations

```yaml
# RAG skill — degrade gracefully on any failure
---
name: rag-retrieval
on_fail: reasoning-only.md
on_empty_result: hitl-gate
on_timeout: reasoning-only.md
retry_count: 3
---

# Security audit — never silently degrade; always escalate to human
---
name: security-audit
on_fail: llm-only-security-review.md
on_empty_result: hitl-gate
on_timeout: llm-only-security-review.md
retry_count: 2
---

# Incident response — escalate immediately; no retry delay in production outage
---
name: incident-response
on_fail: hitl-gate
on_empty_result: reasoning-only.md
on_timeout: hitl-gate
retry_count: 1
---

# Code review — degrade to deterministic lint if LLM review fails
---
name: code-review
on_fail: basic-lint-only.md
on_empty_result: hitl-gate
on_timeout: basic-lint-only.md
retry_count: 2
---
```

### Interaction with ERROR_POLICY.md

When `on_fail` is set, the runner applies this decision tree:

```
Skill fails
    │
    ├── retries_remaining > 0?
    │   YES → retry with backoff → loop
    │   NO  → continue below
    │
    ├── error_type == empty_result AND on_empty_result set?
    │   YES → invoke on_empty_result target
    │
    ├── error_type == timeout AND on_timeout set?
    │   YES → invoke on_timeout target
    │
    ├── on_fail set?
    │   YES → invoke on_fail target (overrides ERROR_POLICY.md fallback_chain)
    │
    └── on_fail NOT set?
        └── use ERROR_POLICY.md fallback_chain for this skill (global policy)
```

**Level 4 FATAL errors** (auth failure, kill switch, budget ceiling) bypass `on_fail`
entirely and halt immediately — these are non-recoverable by design.

### Validation Rules (enforced by validate.sh)

```
on_fail target:        must be a reserved value OR exist in .agents/skills/
on_empty_result:       same rules as on_fail
on_timeout:            same rules as on_fail
retry_count:           integer, 0–10
hitl-gate reference:   logic/GATE.md must exist in package (WARNING if missing)
```

### Audit Events Generated

| Event | When |
|---|---|
| `skill_retry` | Each retry attempt (within retry_count) |
| `skill_on_fail_invoked` | on_fail target invoked after retries exhausted |
| `skill_on_empty_invoked` | on_empty_result target invoked |
| `skill_on_timeout_invoked` | on_timeout target invoked |
| `skill_fallback_resolved` | Fallback skill completed successfully |
| `skill_fallback_failed` | Fallback also failed — escalating to next level |

All events include `precedence: "skill-level"` and `error_policy_overridden: true`
to distinguish from global ERROR_POLICY.md-governed fallbacks in audit reports.
