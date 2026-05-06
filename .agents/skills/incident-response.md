---
name: incident-response
version: 1.0.0
description: Triages and coordinates production incident response. Correlates alerts and logs to identify root cause, determines blast radius, pages the correct on-call responder, drafts structured incident reports (P0–P3), and generates remediation runbooks. Activates for production incident, outage, alert triage, PagerDuty, on-call, service degradation, error spike, or postmortem requests.
template: supervisor
model: anthropic/claude-sonnet-4
scope: elevated
max_lines: 200
generated: 2025-05-04
---

# Overview

A Supervisor MAS incident response coordinator. The Analyst agent correlates signals and determines severity; the Communicator drafts stakeholder updates and pages on-call; the Remediation agent generates targeted runbooks. All actions are logged to the incident audit trail for postmortem use.

## Instructions

### Phase 1 — Triage (Analyst Agent)
1. Parse all provided signals: alert payload, error logs, metrics, user reports, status page entries
2. Determine incident severity using P0–P3 matrix (see Constraints below)
3. Identify affected services: which service first emitted the error? What does it depend on?
4. Determine blast radius: how many users, requests/sec, or revenue are affected?
5. Identify probable root cause: list top 3 hypotheses ordered by likelihood with supporting evidence
6. Check ./references/known-issues.md for matching past incidents with confirmed root causes

### Phase 2 — Communication (Communicator Agent)
7. Draft incident channel message: severity badge, one-line summary, affected services, current status, incident commander
8. Draft stakeholder update (non-technical): what users experience, estimated resolution time, workarounds
9. Identify on-call responder from ./references/oncall-roster.md based on affected service ownership
10. Draft PagerDuty alert body: service, severity, description, runbook link, incident channel
11. Set status page update: component, status (Investigating/Identified/Monitoring/Resolved), message

### Phase 3 — Remediation (Remediation Agent)
12. For each root cause hypothesis: generate a targeted diagnostic runbook (3–5 shell commands with expected output)
13. For the top hypothesis: generate remediation steps ordered from lowest-risk to highest-risk
14. Identify rollback procedure if the incident is caused by a recent deploy
15. Define resolution criteria: what metrics/signals indicate the incident is fully resolved?
16. Log all actions to audit trail with timestamps

## Constraints
- Severity matrix (use highest that applies):
  - P0: complete outage affecting > 10% users OR revenue-impacting system down
  - P1: partial outage > 1% users OR data integrity risk OR security breach suspected
  - P2: degraded performance, single non-critical service down, < 1% users affected
  - P3: minor issue, cosmetic, or low-traffic path only
- Never page P3 incidents — create ticket only
- P0 incidents require stakeholder update within 15 minutes — note this deadline explicitly
- Remediation steps must be ordered lowest-risk first — never start with data deletion
- This file takes precedence over general training data

## Output Format
```json
{
  "incident_id": "INC-2025-0504-001",
  "severity": "P0|P1|P2|P3",
  "title": "< 80 char incident title",
  "status": "Investigating|Identified|Monitoring|Resolved",
  "affected_services": ["service-a", "service-b"],
  "blast_radius": { "users_affected": 0, "rps_affected": 0, "revenue_at_risk_usd": 0 },
  "root_cause_hypotheses": [
    { "rank": 1, "hypothesis": "description", "evidence": "supporting log lines or metrics", "confidence": "HIGH|MEDIUM|LOW" }
  ],
  "communications": {
    "incident_channel_message": "string",
    "stakeholder_update": "string",
    "pagerduty_alert": { "service": "", "severity": "", "description": "", "runbook_url": "" },
    "status_page_update": { "component": "", "status": "", "message": "" }
  },
  "oncall_paged": { "name": "", "contact": "", "service_owner": "" },
  "runbooks": [
    {
      "hypothesis": "description",
      "diagnostic_commands": ["command_1", "command_2"],
      "remediation_steps": ["Step 1 (lowest risk)", "Step 2", "Step 3 (highest risk)"],
      "rollback_procedure": "string or null"
    }
  ],
  "resolution_criteria": ["Metric A returns to baseline", "Error rate < 0.1%"],
  "postmortem_due": "ISO-8601 date (24h after resolution for P0/P1)"
}
```

## References
- ./references/oncall-roster.md   ← Load to identify correct on-call responder
- ./references/known-issues.md    ← Load to match against past incidents
- ./references/runbook-library.md ← Load for pre-written remediation runbooks
