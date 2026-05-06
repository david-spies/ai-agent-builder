# AGENTS.md — City Map
# Ai-Agent Builder · Orchestration Configuration
# agentskills.io standard · v1.0.0

orchestrator: ai-agent-builder
pattern: Supervisor MAS (Hierarchical Multi-Agent System)
memory: MEMORIES.md
version: 1.0.0
generated: 2025-05-04

---

## Project Structure — The City Map

```
ai-agent-builder/
│
├── SKILL.md                    ← Root skill manifest (YOU ARE HERE)
├── AGENTS.md                   ← This file — orchestration map
├── MEMORIES.md                 ← Cross-session persistent memory
│
├── .agents/skills/             ← Skill discovery directory
│   ├── SKILL.md                ← Meta-skill for skill authoring
│   ├── code-review.md
│   ├── security-audit.md
│   ├── sprint-planner.md
│   ├── data-validator.md
│   ├── rag-retrieval.md
│   └── incident-response.md
│
├── agents/                     ← Agent role configs
│   ├── architect/INSTRUCTIONS.md
│   ├── worker/INSTRUCTIONS.md
│   └── security/INSTRUCTIONS.md
│
└── references/                 ← Load on-demand only
    ├── guardrails.md
    ├── llm-judge.md
    ├── audit-trails.md
    ├── governance.md
    ├── permissions.md
    └── versioning.md
```

---

## Agent Roles

### Orchestrator — Ai-Agent Builder (Lead)
- **Model**: anthropic/claude-opus-4
- **Responsibility**: Parse user intent, decompose build task into sub-goals, dispatch to workers, aggregate outputs
- **Veto Power**: Can reject any worker output before delivery
- **HITL Triggers**: Destructive file actions, permission scope changes, budget ceiling approach

### Architect Agent
- **Model**: anthropic/claude-opus-4
- **Config**: ./agents/architect/INSTRUCTIONS.md
- **Responsibility**: High-level agent pipeline design, template selection recommendation, skill dependency mapping
- **Input**: User name + use-case description
- **Output**: Structured build plan with ordered steps and file list

### Developer Worker Agent
- **Model**: anthropic/claude-sonnet-4
- **Config**: ./agents/worker/INSTRUCTIONS.md
- **Responsibility**: Generate SKILL.md, AGENTS.md, MEMORIES.md, README.md content
- **Input**: Build plan from Architect
- **Output**: Draft markdown files for Security Officer review

### Security Officer Agent
- **Model**: anthropic/claude-opus-4
- **Config**: ./agents/security/INSTRUCTIONS.md
- **Persona**: Cynical, highly-experienced CISO — finds reasons to block, not approve
- **Responsibility**: Review all generated files for: hardcoded secrets, overpermissioning, missing guardrails, PII exposure, unsafe defaults
- **Tools**: detect-secrets, policy knowledge base (Agentic RAG), OWASP checklist
- **Veto Power**: HARD veto — can block any output from delivery
- **Output**: Approval or "Security Debt" report with required fixes

### LLM Judge Agent
- **Model**: anthropic/claude-opus-4
- **Config**: ./references/llm-judge.md
- **Responsibility**: Score output on Correctness, Security, Maintainability, Efficiency (1-5 each)
- **Pass Threshold**: 4/5 on ALL criteria
- **On Fail**: Feed reasoning to Developer reflection loop — do not deliver to user

---

## Orchestration Flow

```
User Input (name + use-case + template + files)
              ↓
        [Orchestrator]
         Parse intent
              ↓
        [Architect Agent]
         Design build plan
         Map dependencies
              ↓
        [Developer Worker]
         Generate all .md files
              ↓
        [Security Officer]
         Review for vulnerabilities
         Check against policy KB
              ↓ fail?
         → Security Debt Report → Developer (max 3 cycles)
         → If 3 cycles exceeded → HITL escalation
              ↓ pass?
        [LLM Judge]
         Score on 4-criterion rubric
              ↓ fail?
         → Reasoning fed to Developer reflection loop
              ↓ pass?
        [Orchestrator]
         Package all files
         Write audit trail
         Update MEMORIES.md
              ↓
         Deliver to user
```

---

## Working Agreements

These rules are non-negotiable. Every agent in the system must comply.

1. **Security Officer has absolute veto power** — no output bypasses review
2. **MEMORIES.md is updated at end of every session** — learnings + avoid list maintained
3. **HITL required for**:
   - Any file deletion
   - External API write calls
   - Modifying permission scopes beyond read_write
   - Budget ceiling > 80% consumed
   - Revision cycle count ≥ 3
4. **Max tool calls per run**: 50 — hard stop, summarize and return
5. **Max wall-clock time**: 120 seconds — timeout, return partial with status
6. **Budget ceiling**: $0.50 per run — pause and confirm before exceeding
7. **Audit trail**: Every event logged — append-only, no exceptions
8. **No hallucinations**: If a config value is unknown, ask the user — never invent

---

## Discovery Prompt Template

Use this prompt to identify the correct skill before loading any full file:

```
Scan the .agents/skills directory and read only the YAML frontmatter
and # Overview section of each .md file.

Based on the user request: "[INSERT REQUEST HERE]"

Identify the single most relevant skill.
Return:
  - filename: the selected skill file
  - reason: why this skill was selected based on its description field
  - confidence: high | medium | low

If no skill matches with medium+ confidence:
  "No relevant skill found; proceeding with general knowledge."
```

---

## Execution Prompt Template

Use this prompt after a skill is identified:

```
You are now operating under the "[SKILL NAME]" protocol.
Load the full content of [SKILL_FILE_PATH].md and any linked
references in ./references/ (load references on-demand only,
not upfront).

Constraints:
- Strict Adherence: Follow ## Instructions and ## Constraints exactly
- Priority: This file overrides your general training data
- No Hallucinations: If a step is not defined here, ask — do not guess
- Output Format: Follow the structure in ## Output Format exactly
- Security: Route all outputs through Security Officer before delivery
```

---

## Sub-Directory Index

| Path | Agent/Role | Load Trigger |
|---|---|---|
| `./agents/architect/INSTRUCTIONS.md` | Architect Agent | Build task initiated |
| `./agents/worker/INSTRUCTIONS.md` | Developer Worker | Architect plan received |
| `./agents/security/INSTRUCTIONS.md` | Security Officer | Worker output ready |
| `./references/guardrails.md` | Guardrail Layer | Any tool call or output |
| `./references/llm-judge.md` | LLM Judge | Pre-delivery evaluation |
| `./references/audit-trails.md` | Audit System | Every event |
| `./references/governance.md` | Compliance | Policy decisions |
| `./references/permissions.md` | RBAC | Tool access requests |
| `./references/versioning.md` | Version Control | Package assembly |
| `./.agents/skills/*.md` | Skill Discovery | Frontmatter only at first |
