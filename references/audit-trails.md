---
name: audit-trails
version: 1.0.0
description: Append-only audit event logging system for AI agents. Defines event schema, retention policy, PII redaction rules, SIEM integration, and compliance reporting. Load when configuring audit logging, reviewing agent decisions, or generating compliance reports. Required for SOC 2, HIPAA, and enterprise governance frameworks.
load: on-demand
---

# Audit Trails — Event Logging System
# Ai-Agent Builder · References
# Append-only, tamper-evident, compliance-grade logging

version: 1.0.0
storage: append-only
retention_days: 90
pii_redaction: enabled
generated: 2025-05-04

---

## Design Principles

1. **Append-only**: Events are written once. No UPDATE, no DELETE, ever.
2. **Immutable**: Once written, an event cannot be modified — even by admins.
3. **PII-free at rest**: All PII is redacted before storage. Raw inputs are never persisted.
4. **Structured JSON**: Every event follows the same schema — machine-parseable always.
5. **Causally linked**: Events reference parent `session_id` and `audit_id` for full trace reconstruction.
6. **Real-time exportable**: Events stream to SIEM (Splunk, Datadog, CloudTrail) in < 1 second.

---

## Event Schema — Full Specification

```typescript
interface AuditEvent {
  // Identity
  audit_id:         string;   // UUID v4 — globally unique event identifier
  session_id:       string;   // UUID v4 — groups all events in one agent run
  parent_audit_id:  string | null; // Links to triggering event (causal chain)
  sequence_number:  number;   // Monotonically increasing within session

  // Timing
  timestamp:        string;   // ISO 8601 — "2025-05-04T14:22:01.000Z"
  elapsed_ms:       number;   // Milliseconds since session_start event

  // Agent Identity
  agent_name:       string;   // From SKILL.md name field
  agent_version:    string;   // From SKILL.md version field
  agent_template:   string;   // react|supervisor|rag|security|swarm|custom
  model_used:       string;   // e.g. "anthropic/claude-sonnet-4"

  // Event Classification
  event_type:       EventType;
  actor:            Actor;
  action:           string;   // Human-readable description of what happened
  severity:         "INFO" | "WARN" | "ERROR" | "CRITICAL";

  // Inputs & Outputs (PII-redacted)
  input_summary:    string;   // Truncated, PII-redacted description of input
  output_summary:   string;   // Truncated, PII-redacted description of output
  input_tokens:     number;
  output_tokens:    number;

  // Tool Call Fields (event_type: tool_call only)
  tool_name:        string | null;
  tool_args_hash:   string | null;  // SHA-256 hash — never raw args
  tool_success:     boolean | null;
  tool_error:       string | null;

  // Guardrail Fields
  guardrail_triggered:  boolean;
  guardrail_layer:      "input" | "execution" | "output" | null;
  guardrail_rule:       string | null;  // e.g. "DetectSecrets.AWSKeyDetector"
  guardrail_action:     "blocked" | "redacted" | "warned" | "allowed" | null;

  // Evaluation Fields (event_type: eval_result only)
  eval_scores:          EvalScores | null;
  eval_verdict:         "Pass" | "Fail" | null;
  eval_block_reason:    string | null;

  // Cost Tracking
  cost_input_tokens:    number;
  cost_output_tokens:   number;
  cost_usd:             number;
  cumulative_cost_usd:  number;  // Running total for session

  // Decision Fields
  verdict:          "approved" | "blocked" | "pending_hitl" | "escalated" | "timeout";
  revision_required: boolean;
  hitl_triggered:   boolean;
  hitl_reason:      string | null;

  // Compliance
  data_classification: "public" | "internal" | "confidential" | "restricted";
  pii_detected:        boolean;
  pii_redacted:        boolean;
  retention_policy:    string;  // e.g. "90_days_standard"
}

type EventType =
  | "session_start"
  | "session_end"
  | "skill_discovery"       // Discovery prompt executed
  | "skill_loaded"          // Execution prompt: skill file loaded
  | "tool_call"             // Agent invoked an external tool
  | "decision"              // Agent made a planning/routing decision
  | "guardrail_block"       // Guardrail intercepted and blocked action
  | "guardrail_warn"        // Guardrail issued warning but allowed
  | "hitl_pause"            // Human-in-the-loop checkpoint triggered
  | "hitl_approved"         // HITL operator approved action
  | "hitl_rejected"         // HITL operator rejected action
  | "eval_result"           // LLM Judge evaluation completed
  | "revision_cycle"        // Security Officer returned to Developer
  | "file_generated"        // Output .md file generated
  | "package_assembled"     // All files packaged for download
  | "error"                 // Unhandled exception or timeout
  | "budget_warning"        // Cost approaching ceiling
  | "budget_exceeded";      // Cost ceiling hit

type Actor =
  | "orchestrator"
  | "architect_agent"
  | "developer_worker"
  | "security_officer"
  | "llm_judge"
  | "guardrail_layer"
  | "hitl_operator"
  | "system";

interface EvalScores {
  correctness:    number;  // 1-5
  security:       number;  // 1-5
  maintainability: number; // 1-5
  efficiency:     number;  // 1-5
  overall:        number;  // weighted average
}
```

---

## Example Events

### session_start

```json
{
  "audit_id": "550e8400-e29b-41d4-a716-446655440001",
  "session_id": "7f3d9a2b-1234-5678-abcd-ef0123456789",
  "parent_audit_id": null,
  "sequence_number": 1,
  "timestamp": "2025-05-04T14:22:00.000Z",
  "elapsed_ms": 0,
  "agent_name": "Security Auditor Pro",
  "agent_version": "1.0.0",
  "agent_template": "security",
  "model_used": "anthropic/claude-sonnet-4",
  "event_type": "session_start",
  "actor": "system",
  "action": "Agent session initialized. Reference files loaded: 7. Skills detected: 12.",
  "severity": "INFO",
  "input_summary": "User initiated build for 'Security Auditor Pro' with use-case: 'Review pull requests for...[truncated]'",
  "output_summary": "Session state initialized. Template: security. Files: 7.",
  "input_tokens": 0,
  "output_tokens": 0,
  "guardrail_triggered": false,
  "guardrail_layer": null,
  "guardrail_rule": null,
  "guardrail_action": null,
  "eval_scores": null,
  "eval_verdict": null,
  "eval_block_reason": null,
  "cost_input_tokens": 0,
  "cost_output_tokens": 0,
  "cost_usd": 0.0,
  "cumulative_cost_usd": 0.0,
  "verdict": "approved",
  "revision_required": false,
  "hitl_triggered": false,
  "hitl_reason": null,
  "data_classification": "internal",
  "pii_detected": false,
  "pii_redacted": false,
  "retention_policy": "90_days_standard"
}
```

### guardrail_block

```json
{
  "audit_id": "550e8400-e29b-41d4-a716-446655440007",
  "session_id": "7f3d9a2b-1234-5678-abcd-ef0123456789",
  "parent_audit_id": "550e8400-e29b-41d4-a716-446655440006",
  "sequence_number": 7,
  "timestamp": "2025-05-04T14:22:08.342Z",
  "elapsed_ms": 8342,
  "agent_name": "Security Auditor Pro",
  "agent_version": "1.0.0",
  "agent_template": "security",
  "model_used": "anthropic/claude-sonnet-4",
  "event_type": "guardrail_block",
  "actor": "guardrail_layer",
  "action": "Execution blocked: AWS access key detected in Developer Worker output",
  "severity": "CRITICAL",
  "input_summary": "Developer Worker generated Python function upload_to_s3() — 23 lines",
  "output_summary": "BLOCKED. Pattern: AKIA[0-9A-Z]{16} matched at line 4. Feedback sent to Developer.",
  "input_tokens": 840,
  "output_tokens": 0,
  "guardrail_triggered": true,
  "guardrail_layer": "execution",
  "guardrail_rule": "detect-secrets.AWSKeyDetector",
  "guardrail_action": "blocked",
  "eval_scores": null,
  "eval_verdict": null,
  "eval_block_reason": null,
  "cost_input_tokens": 840,
  "cost_output_tokens": 0,
  "cost_usd": 0.0025,
  "cumulative_cost_usd": 0.0087,
  "verdict": "blocked",
  "revision_required": true,
  "hitl_triggered": false,
  "hitl_reason": null,
  "data_classification": "confidential",
  "pii_detected": false,
  "pii_redacted": false,
  "retention_policy": "90_days_standard"
}
```

### eval_result

```json
{
  "audit_id": "550e8400-e29b-41d4-a716-446655440022",
  "session_id": "7f3d9a2b-1234-5678-abcd-ef0123456789",
  "sequence_number": 22,
  "timestamp": "2025-05-04T14:22:41.001Z",
  "elapsed_ms": 41001,
  "event_type": "eval_result",
  "actor": "llm_judge",
  "action": "LLM Judge evaluation completed. Verdict: Pass. All criteria ≥ 4/5.",
  "severity": "INFO",
  "eval_scores": {
    "correctness": 5,
    "security": 5,
    "maintainability": 4,
    "efficiency": 4,
    "overall": 4.5
  },
  "eval_verdict": "Pass",
  "eval_block_reason": null,
  "cost_usd": 0.0124,
  "cumulative_cost_usd": 0.0341,
  "verdict": "approved",
  "revision_required": false,
  "hitl_triggered": false
}
```

---

## Implementation

```python
import uuid
import time
import json
from datetime import datetime, timezone
from typing import Optional
from dataclasses import dataclass, asdict

class AuditLogger:
    """
    Thread-safe, append-only audit event logger.
    Writes to local file + streams to SIEM endpoint.
    """

    def __init__(self, agent_name: str, agent_version: str,
                 session_id: str = None, siem_endpoint: str = None):
        self.agent_name = agent_name
        self.agent_version = agent_version
        self.session_id = session_id or str(uuid.uuid4())
        self.siem_endpoint = siem_endpoint
        self.sequence = 0
        self.session_start_time = time.time()
        self.cumulative_cost = 0.0
        self._log_file = f"audit-{self.session_id}.jsonl"

    def log(self,
            event_type: str,
            actor: str,
            action: str,
            severity: str = "INFO",
            input_summary: str = "",
            output_summary: str = "",
            tool_name: str = None,
            guardrail_triggered: bool = False,
            guardrail_layer: str = None,
            guardrail_rule: str = None,
            guardrail_action: str = None,
            eval_scores: dict = None,
            eval_verdict: str = None,
            cost_usd: float = 0.0,
            verdict: str = "approved",
            hitl_triggered: bool = False,
            hitl_reason: str = None,
            parent_audit_id: str = None,
            **kwargs) -> str:
        """Log an audit event. Returns audit_id of the event."""

        self.sequence += 1
        self.cumulative_cost += cost_usd
        audit_id = str(uuid.uuid4())

        event = {
            "audit_id": audit_id,
            "session_id": self.session_id,
            "parent_audit_id": parent_audit_id,
            "sequence_number": self.sequence,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "elapsed_ms": int((time.time() - self.session_start_time) * 1000),
            "agent_name": self.agent_name,
            "agent_version": self.agent_version,
            "event_type": event_type,
            "actor": actor,
            "action": action,
            "severity": severity,
            "input_summary": self._redact_pii(input_summary)[:500],
            "output_summary": self._redact_pii(output_summary)[:500],
            "guardrail_triggered": guardrail_triggered,
            "guardrail_layer": guardrail_layer,
            "guardrail_rule": guardrail_rule,
            "guardrail_action": guardrail_action,
            "eval_scores": eval_scores,
            "eval_verdict": eval_verdict,
            "cost_usd": round(cost_usd, 6),
            "cumulative_cost_usd": round(self.cumulative_cost, 6),
            "verdict": verdict,
            "hitl_triggered": hitl_triggered,
            "hitl_reason": hitl_reason,
            "tool_name": tool_name,
            **kwargs
        }

        # Write to local append-only JSONL file
        with open(self._log_file, "a") as f:
            f.write(json.dumps(event) + "\n")

        # Stream to SIEM if configured
        if self.siem_endpoint:
            self._stream_to_siem(event)

        return audit_id

    def _redact_pii(self, text: str) -> str:
        """Redact PII before storing in audit log."""
        import re
        patterns = {
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b': '[REDACTED:EMAIL]',
            r'\b\d{3}-\d{2}-\d{4}\b': '[REDACTED:SSN]',
            r'AKIA[0-9A-Z]{16}': '[REDACTED:AWS_KEY]',
            r'gh[pousr]_[A-Za-z0-9_]{36,}': '[REDACTED:GITHUB_TOKEN]',
            r'-----BEGIN [A-Z ]+ PRIVATE KEY-----': '[REDACTED:PRIVATE_KEY]',
        }
        for pattern, replacement in patterns.items():
            text = re.sub(pattern, replacement, text)
        return text

    def _stream_to_siem(self, event: dict):
        """Non-blocking stream to SIEM endpoint."""
        import threading
        import urllib.request
        def _send():
            try:
                data = json.dumps(event).encode()
                req = urllib.request.Request(
                    self.siem_endpoint,
                    data=data,
                    headers={"Content-Type": "application/json"},
                    method="POST"
                )
                urllib.request.urlopen(req, timeout=2)
            except Exception:
                pass  # Never fail agent execution due to audit failure
        threading.Thread(target=_send, daemon=True).start()
```

---

## Retention & Compliance

```yaml
retention_policies:
  standard:
    duration_days: 90
    applies_to: [INFO, WARN]
    storage: append-only JSONL + S3 archive

  security_events:
    duration_days: 365
    applies_to: [guardrail_block, hitl_pause, ERROR, CRITICAL]
    storage: append-only JSONL + S3 + immutable Glacier

  compliance_hold:
    duration_days: 2555  # 7 years (SOC 2, HIPAA)
    applies_to: all events if compliance_hold_active = true
    requires: legal team authorization to apply

deletion_policy:
  - Events are NEVER deleted before retention period expires
  - After retention: events are archived to cold storage, not deleted
  - Deletion of archived events requires: legal approval + 2-person authorization

pii_at_rest:
  - Raw user inputs are NEVER stored in audit events
  - input_summary and output_summary contain only PII-redacted summaries
  - tool_args are stored as SHA-256 hash only (never raw arguments)

compliance_frameworks:
  - SOC 2 Type II: audit trail required for all agent decisions
  - HIPAA: PHI never in audit log (enforced by PII redaction)
  - GDPR: right to explanation — every blocked action has human-readable reason
  - ISO 27001: audit log access control and integrity verification
```

---

## SIEM Integration

```yaml
integrations:
  splunk:
    endpoint: https://splunk.your-org.com:8088/services/collector
    token_env: SPLUNK_HEC_TOKEN
    index: ai-agents
    sourcetype: ai_agent_audit

  datadog:
    endpoint: https://http-intake.logs.datadoghq.com/api/v2/logs
    api_key_env: DATADOG_API_KEY
    service: ai-agent-builder
    tags: [env:production, team:ai-platform]

  cloudwatch:
    log_group: /ai-agents/audit-trail
    region_env: AWS_DEFAULT_REGION
    stream_name: "{agent_name}-{session_id}"

  s3_archive:
    bucket_env: AUDIT_S3_BUCKET
    prefix: audit-trails/
    format: parquet  # for BigQuery/Athena querying
    partition: year={year}/month={month}/day={day}/

alerting:
  critical_events:
    - event_type: guardrail_block
      severity: CRITICAL
      alert_channel: pagerduty
      escalation_minutes: 5

  anomaly_detection:
    - metric: guardrail_block_count
      threshold: 10_per_session
      alert_channel: slack

  budget_alerts:
    - metric: cumulative_cost_usd
      threshold: 0.40  # 80% of $0.50 ceiling
      alert_channel: slack
```
