---
name: governance
version: 1.0.0
description: Enterprise governance framework for AI agents. Defines compliance policies, data handling rules, approval workflows, change management procedures, incident response, and regulatory alignment (SOC 2, HIPAA, GDPR, ISO 27001). Load when making policy decisions, reviewing compliance requirements, or onboarding agents to regulated environments.
load: on-demand
---

# Governance — Enterprise AI Agent Policy Framework
# Ai-Agent Builder · References

version: 1.0.0
generated: 2025-05-04
frameworks: [SOC 2 Type II, GDPR, HIPAA, ISO 27001, NIST AI RMF]

---

## Core Governance Principles

### 1. Minimal Footprint
Agents request only the permissions, data, and compute strictly necessary for the declared task. Any scope not explicitly required by SKILL.md is denied by default.

### 2. Purpose Limitation
An agent's declared purpose (defined in `description:` field of SKILL.md) cannot be changed at runtime. A user instruction that attempts to redirect the agent to an undeclared purpose triggers a HITL pause.

### 3. Transparency & Explainability
Every blocked action includes a human-readable reason. Every agent decision is logged to the audit trail. Users can always query "why did the agent do that?" and receive a traceable answer.

### 4. Human Oversight
Agents are tools that augment human judgment — they do not replace it for high-stakes decisions. HITL gates are non-negotiable for irreversible, destructive, or financial actions.

### 5. Continuous Evaluation
Agents are not "deploy and forget." Quality is continuously measured against the golden-set eval dataset. Regressions trigger automatic rollback.

---

## Data Handling Policies

```yaml
data_classification:
  public:
    description: Information safe to share externally
    examples: [published documentation, public APIs]
    agent_permitted: read, process, output
    retention: no restriction

  internal:
    description: Business information for internal use only
    examples: [internal docs, meeting notes, code]
    agent_permitted: read, process, summarize
    retention: 90 days in audit trail

  confidential:
    description: Sensitive business or customer data
    examples: [financial records, personnel data, contracts]
    agent_permitted: read (with explicit approval), process
    pii_masking: required
    retention: 365 days, encrypted at rest
    hitl_required: for any output action

  restricted:
    description: Highest sensitivity — regulatory or legal significance
    examples: [PHI, PII, legal holds, source code IP]
    agent_permitted: read (with dual approval)
    pii_masking: required + verified
    retention: 7 years (regulatory hold)
    hitl_required: always
    encryption: AES-256 at rest + TLS 1.3 in transit

data_minimization:
  - Agent reads only the files/fields needed for declared task
  - Context window cleared after session — not persisted
  - MEMORIES.md stores only learnings, never raw data
  - Embeddings stored without source text where possible

data_residency:
  - Production data must not leave declared geographic region
  - LLM API calls route through region-specific endpoints
  - Audit logs stored in same region as production data
```

---

## Approval Workflows

### New Agent Onboarding

```
Step 1: Author submits SKILL.md + AGENTS.md + all reference files
        ↓
Step 2: Automated pre-check:
        - SKILL.md schema validation
        - permissions.md least-privilege review
        - guardrails.md completeness check
        ↓
Step 3: Security Officer review (human)
        - Red team eval run (all 7 probes must pass)
        - Golden set eval (all criteria ≥ 4/5)
        ↓
Step 4: Data Privacy review (DPO sign-off if confidential/restricted data)
        ↓
Step 5: Change Management approval (see below)
        ↓
Step 6: Staged deployment:
        dev → staging → production (canary 5% → 25% → 100%)
        ↓
Step 7: Post-deployment monitoring (48h watch period)
```

### Change Management

```yaml
change_categories:
  low_risk:
    description: Documentation changes, description field edits, typo fixes
    approvers: [agent_author]
    eval_required: true
    deploy_window: any time

  medium_risk:
    description: New skills added, instruction changes, model swap
    approvers: [agent_author, tech_lead]
    eval_required: true
    red_team_required: false
    deploy_window: business hours only
    rollback_plan: required

  high_risk:
    description: Permission scope changes, guardrail modifications, new tool access
    approvers: [agent_author, tech_lead, security_officer]
    eval_required: true
    red_team_required: true
    deploy_window: planned maintenance window
    rollback_plan: required + tested
    post_deploy_monitoring: 48 hours

  critical:
    description: HITL gate changes, audit trail modifications, encryption changes
    approvers: [agent_author, tech_lead, security_officer, CISO]
    board_notification: required
    deploy_window: planned + communicated 72h in advance
    rollback_plan: required + tested + rehearsed
```

---

## Incident Response

### Severity Definitions

| Severity | Definition | Response SLA |
|---|---|---|
| P0 — Critical | Agent caused data exfiltration, unauthorized access, financial loss | 15 minutes |
| P1 — High | Agent bypassed guardrail, HITL gate failed, audit log gap | 1 hour |
| P2 — Medium | Eval regression detected, unexpected behavior, cost overrun | 4 hours |
| P3 — Low | Performance degradation, minor output quality issues | 24 hours |

### P0/P1 Response Playbook

```
0:00 — Alert fires (PagerDuty / Slack)
0:05 — On-call engineer acknowledges
0:10 — Agent SUSPENDED immediately (kill switch activated)
0:15 — Incident channel created #incident-agent-{name}-{date}
0:20 — Blast radius assessment: What data was accessed? What actions taken?
0:30 — Stakeholder notification (engineering lead, CISO, legal if required)
1:00 — Root cause investigation begins
       - Audit trail review from session_start to incident event
       - Guardrail log analysis
       - Model output review
4:00 — Preliminary findings shared with stakeholders
24h  — Full incident report published (internal)
48h  — Remediation deployed to dev environment
72h  — Remediation tested and eval'd
1wk  — Post-mortem published, action items assigned
```

### Kill Switch

Every deployed agent must have a kill switch:

```python
# Environment variable that immediately disables agent
AGENT_KILL_SWITCH=true  # Set this to suspend all agent operations

# Implementation
import os
def check_kill_switch():
    if os.environ.get("AGENT_KILL_SWITCH", "false").lower() == "true":
        raise AgentSuspendedError(
            "Agent suspended by operator. "
            "See incident channel for details."
        )
```

---

## Regulatory Alignment

### SOC 2 Type II

| Control | Implementation |
|---|---|
| CC6.1 — Logical access | permissions.md RBAC, environment variable scoping |
| CC6.2 — Authentication | API key rotation, no hardcoded credentials |
| CC6.3 — Access removal | Session-scoped tokens, no persistent auth |
| CC7.2 — Monitoring | Audit trail streaming to SIEM |
| CC8.1 — Change management | Approval workflow above |
| A1.2 — System availability | Cost ceiling, timeout guardrails |

### GDPR Articles

| Article | Implementation |
|---|---|
| Art. 5 — Data minimization | Only necessary data in context |
| Art. 13/14 — Transparency | Every agent decision logged and explainable |
| Art. 17 — Right to erasure | PII never stored in audit logs |
| Art. 22 — Automated decisions | HITL gate for decisions affecting individuals |
| Art. 25 — Privacy by design | PII masking at Layer 1 guardrail |
| Art. 32 — Security | Encryption, sandbox, least privilege |

### HIPAA (if handling PHI)

```yaml
hipaa_controls:
  - PHI never enters LLM context without explicit BAA with provider
  - PHI redacted at Layer 1 before reaching model
  - Audit trail maintained for 6 years (§164.530(j))
  - Access limited to workforce members with need-to-know
  - Transmission security: TLS 1.3 required for all PHI-adjacent API calls
  - Business Associate Agreement required with:
      - LLM provider (Anthropic, OpenAI, etc.)
      - Audit log storage provider
      - SIEM provider
```

---

## Model Governance

```yaml
model_approval_process:
  new_model_adoption:
    - Security review of provider data handling policies
    - BAA review if handling regulated data
    - Capability benchmark against current model
    - Red team eval with new model
    - Staged rollout: 5% → 25% → 100%

  model_deprecation:
    - 90-day notice before removing model from approved list
    - Migration guide published
    - Eval comparison between old and new model

approved_models:
  - anthropic/claude-opus-4       # Judge/Architect
  - anthropic/claude-sonnet-4     # Worker agents
  - openai/gpt-4o                 # Alternative worker
  - openai/o3                     # Reasoning-heavy tasks
  - google/gemini-2.5-pro         # Long-context tasks
  - meta/llama-3.3-70b            # Self-hosted option

prohibited_models:
  - Any model without published responsible AI policy
  - Any model without data processing agreements
  - Models trained on data known to contain stolen credentials or copyrighted code without license
```

---

## Governance Review Schedule

```yaml
reviews:
  weekly:
    - Audit trail anomaly review
    - Guardrail trigger rate analysis
    - Cost trend review

  monthly:
    - Eval regression review (compare to production baseline)
    - Permission scope audit (are agents using what they requested?)
    - Incident post-mortem follow-up

  quarterly:
    - Full red team exercise
    - Data retention policy review
    - Model governance review (new models, deprecated models)
    - Regulatory compliance self-assessment

  annually:
    - External security audit
    - SOC 2 audit
    - Privacy impact assessment update
    - Governance framework review and update
```
