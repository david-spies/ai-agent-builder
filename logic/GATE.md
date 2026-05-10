---
name: gate
spec_version: 1.0.0
component_type: hitl-checkpoint
version: 1.0.0
description: Structural Human-in-the-Loop wait state that pauses agent execution and requires an external approval, rejection, or modification before resuming. Goes beyond conversational HITL — creates a durable "Pending" state that survives process restarts. Required before any destructive, financial, or compliance-sensitive agent action. Activates when agent execution must pause for human review, signature, or override.
default_timeout_hours: 24
on_timeout: auto_reject
state: pending
generated: 2026-05-04
---

# Gate — Human-in-the-Loop Checkpoint
# Ai-Agent Builder · Logic Components
# Durable wait state requiring external approval before execution resumes.

---

## Purpose

Enterprise SaaS requires hard checkpoints for high-stakes actions. Unlike a
conversational HITL prompt, the Gate creates a **durable "Pending" state** — the
agent writes its proposed action to disk, notifies the appropriate approver through
the configured channel, and waits. The agent can be restarted, the server can be
rebooted, and the gate still holds until an authorized response arrives.

**Trigger examples:**
- Deploying code to production
- Moving funds or initiating payments
- Deleting production data
- Granting elevated permissions
- Publishing compliance reports externally

---

## Gate States

```
INACTIVE → PENDING → APPROVED → EXECUTING
                   ↘ REJECTED → STOPPED
                   ↘ MODIFIED → EXECUTING (with changes)
                   ↘ TIMED_OUT → auto_reject or auto_escalate
```

---

## Configuration

```yaml
# Gate checkpoint configuration
timeout_hours: 24              # How long to wait before timeout action
on_timeout: auto_reject        # auto_reject | auto_approve | escalate
escalation_contact: null       # If escalate: who receives the escalated request
require_reason: true           # Approver must provide a reason string
allow_modification: true       # Approver can modify the proposed action
min_approvers: 1               # How many distinct approvals required
approval_roles: []             # If set: only these roles can approve (empty = any)
notify_on_create: true         # Send notification when gate opens
notify_on_resolve: true        # Send notification when gate resolves
notification_channel: slack    # slack | email | webhook | pagerduty
callback_url: null             # Optional: POST to this URL on resolution
```

---

## Gate File Schema

When a Gate is triggered, the runner writes a `.gate` file to persist state across restarts:

```json
{
  "gate_id": "uuid-v4",
  "session_id": "uuid-v4",
  "agent_name": "string",
  "state": "PENDING",
  "created_at": "ISO-8601",
  "expires_at": "ISO-8601",
  "proposed_action": {
    "skill": "deployer-agent.md",
    "description": "Deploy v2.1.4 to production (AWS us-east-1)",
    "payload": { "...": "full action payload" },
    "estimated_impact": "HIGH",
    "reversible": false
  },
  "context_summary": "Agent completed code review (score: 94/100). Security Officer approved. Requesting production deployment authorization.",
  "approvals": [],
  "resolution": null,
  "audit_id": "uuid-v4"
}
```

---

## Notification Payload (sent to approver channel)

```
🔐 *Approval Required — [Agent Name]*

Action:   Deploy v2.1.4 to production (AWS us-east-1)
Impact:   HIGH
Reversible: No
Requested by: agent session uuid-v4
Expires:  2025-05-05T14:22:00Z (24 hours)

Context:
Code review passed (94/100). Security Officer approved.
All red team probes passed.

[ APPROVE ]  [ REJECT ]  [ MODIFY ]  [ VIEW FULL CONTEXT ]

Gate ID: uuid-v4
```

---

## Execution Algorithm

```
GATE TRIGGERED
│
├── Generate gate_id (UUID v4)
├── Write .gates/gate-{id}.json (proposed_action + context_summary)
├── Log: hitl_pause { gate_id, session_id, action_description, expires_at }
│
├── IF notify_on_create:
│   └── Send notification to notification_channel
│
├── WAIT for resolution (poll .gates/ or listen for callback_url POST)
│
├── ON APPROVED:
│   ├── Validate: approver is in approval_roles (if set)
│   ├── Validate: min_approvers threshold met
│   ├── Update gate file: state=APPROVED, approvals=[{approver, reason, timestamp}]
│   ├── Log: hitl_approved { gate_id, approver, reason, duration_ms }
│   ├── IF notify_on_resolve: send resolution notification
│   └── Resume execution: pass original payload to target skill
│
├── ON REJECTED:
│   ├── Update gate file: state=REJECTED, resolution={reason, rejector}
│   ├── Log: hitl_rejected { gate_id, rejector, reason }
│   ├── Write rejection to MEMORIES.md: "Action X rejected by Y — reason: Z"
│   └── STOP execution — return rejection payload to orchestrator
│
├── ON MODIFIED:
│   ├── Approver provides modified payload
│   ├── Update gate file: state=MODIFIED, resolution={modified_payload, modifier}
│   ├── Log: hitl_modified { gate_id, modifier, original_payload_hash, new_payload_hash }
│   └── Resume execution with MODIFIED payload (not original)
│
└── ON TIMEOUT:
    ├── IF on_timeout == auto_reject:
    │   └── Treat as REJECTED — log: hitl_timeout_rejected
    ├── IF on_timeout == auto_approve:
    │   └── Treat as APPROVED — log: hitl_timeout_approved (WARN severity)
    └── IF on_timeout == escalate:
        └── Notify escalation_contact, extend timeout by 24h, log: hitl_escalated
```

---

## Callback URL Contract

If `callback_url` is configured, the external approval UI POSTs to it:

```json
{
  "gate_id": "uuid-v4",
  "resolution": "approved|rejected|modified",
  "approver": "user-identifier",
  "reason": "Required — why approved/rejected",
  "modified_payload": null,
  "timestamp": "ISO-8601",
  "signature": "HMAC-SHA256 of gate_id:resolution:timestamp using shared secret"
}
```

The runner MUST verify the HMAC signature before accepting any resolution.

---

## Output Schema (on resolution)

```json
{
  "gate_id": "uuid-v4",
  "resolution": "approved|rejected|modified",
  "approved_by": "approver-identifier",
  "reason": "string",
  "wait_duration_ms": 3600000,
  "payload": { "...": "original or modified action payload" },
  "resume_execution": true
}
```

---

## Constraints
- Gate state MUST be persisted to disk — not held in memory (survives restarts)
- The runner MUST NOT resume execution without a valid, authenticated resolution
- HMAC signature verification is mandatory for callback_url resolutions
- min_approvers MUST be ≥ 1 — self-approval is never permitted
- Timeout auto-approve MUST log a WARN-severity audit event
- Rejected actions MUST be recorded in MEMORIES.md to prevent re-proposal

## References
- ./references/audit-trails.md     ← hitl_pause, hitl_approved, hitl_rejected events
- ./references/governance.md       ← Approval role definitions and escalation policy
- ./references/permissions.md      ← Which actions require Gate by scope level
- ./.gates/                        ← Gate state file storage (auto-created by runner)
