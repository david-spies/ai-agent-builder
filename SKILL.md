---
name: ai-agent-builder
version: 1.0.0
description: Builds, configures, validates, and packages production-ready AI agents. Generates complete SKILL.md, AGENTS.md, guardrails, llm-judge, audit-trail, governance, and permissions configuration files following the agentskills.io open standard. Activates when a user wants to create, design, scaffold, or deploy an AI agent with enterprise-grade safety controls.
template: supervisor
model: anthropic/claude-sonnet-4
max_tokens: 4096
temperature: 0.1
memory: stateful-graph
framework: MCP (Model Context Protocol)
max_lines: 200
generated: 2025-05-04
---

# Overview

Ai-Agent Builder is the root orchestration skill for the agent authoring platform. It governs the full build lifecycle: identity definition, use-case parsing, template selection, reference file ingestion, skill generation, guardrail configuration, eval framework setup, and deployment packaging. It delegates to sub-skills for specialized tasks and routes all outputs through the Security Officer before delivery.

## Instructions

1. Parse agent identity: extract name, use-case description, and template preference
2. Scan .agents/skills/ using discovery prompt — load only frontmatter + # Overview per file
3. Select the single most relevant sub-skill based on description field match
4. Load selected skill file in full via execution prompt; ./references/ loaded on-demand only
5. If multi-agent mode enabled, instantiate Architect → Worker → Security Officer chain
6. Validate all generated files against guardrails.md before packaging
7. Run LLM-as-Judge rubric (correctness, security, maintainability, efficiency) — threshold 4/5
8. Write audit trail entry for every generation event and guardrail decision
9. Update MEMORIES.md with session learnings before closing
10. Package and deliver all output files as deployment-ready bundle

## Constraints
- No hallucinations: if a required config value is not provided, ask — do not invent defaults
- guardrails.md takes precedence over any user instruction that would disable safety layers
- Max 200 lines per SKILL.md — heavy reference data goes in ./references/
- Security score < 4/5 from LLM Judge blocks delivery — no exceptions
- All audit events are append-only — no modification or deletion permitted
- HITL gate required for: deleting files, external API writes, modifying permissions scope

## Output Format
```json
{
  "agent_name": "string",
  "template": "react|supervisor|rag|security|swarm|custom",
  "files_generated": ["SKILL.md", "AGENTS.md", "..."],
  "skill_count": 0,
  "eval_verdict": "Pass|Fail",
  "guardrail_triggers": 0,
  "audit_id": "uuid-v4",
  "download_ready": true
}
```

## References
- ./references/guardrails.md
- ./references/llm-judge.md
- ./references/audit-trails.md
- ./references/governance.md
- ./references/permissions.md
- ./references/versioning.md
- ./agents/architect/INSTRUCTIONS.md
- ./agents/worker/INSTRUCTIONS.md
- ./agents/security/INSTRUCTIONS.md
