# AGENTS.md — City Map
# Ai-Agent Builder · Orchestration Configuration
# agentskills.io standard · v1.0.0

orchestrator: ai-agent-builder
pattern: Supervisor MAS (Hierarchical Multi-Agent System)
memory: MEMORIES.md
version: 1.1.0
generated: 2026-05-04

---

## Project Structure — The City Map

```
ai-agent-builder/
│
├── SKILL.md                    ← Root skill manifest
├── AGENTS.md                   ← This file
├── MEMORIES.md                 ← Cross-session persistent memory
│
├── logic/                      ← Deterministic logic components
│   ├── ROUTER.md               ← Pre-LLM routing (regex/JSON path rules)
│   ├── SEQUENCE.md             ← Batch iterator controller
│   ├── GATE.md                 ← HITL durable checkpoint
│   ├── DATA_MAP.md             ← Cross-skill JSON field mapper
│   ├── ERROR_POLICY.md         ← Retry, fallback, circuit breaker
│   └── routing-manifest.json   ← Compiled rule index for runner
│
├── .agents/skills/             ← Skill discovery directory
│   ├── SKILL.md
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
- **Responsibility**: Parse user intent, decompose build task, dispatch to workers, aggregate outputs
- **Veto Power**: Can reject any worker output before delivery
- **HITL Triggers**: Destructive file actions, permission scope changes, budget ceiling approach

### Architect Agent
- **Model**: anthropic/claude-opus-4
- **Config**: ./agents/architect/INSTRUCTIONS.md
- **Responsibility**: Pipeline design, template selection, skill dependency mapping, logic component selection
- **Input**: User name + use-case description
- **Output**: Structured build plan with ordered steps, file list, and logic component configuration

### Developer Worker Agent
- **Model**: anthropic/claude-sonnet-4
- **Config**: ./agents/worker/INSTRUCTIONS.md
- **Responsibility**: Generate SKILL.md, AGENTS.md, MEMORIES.md, all 5 logic components, and README.md
- **Input**: Build plan from Architect
- **Output**: Draft files for Security Officer review

### Security Officer Agent
- **Model**: anthropic/claude-opus-4
- **Config**: ./agents/security/INSTRUCTIONS.md
- **Persona**: Cynical CISO — finds reasons to block, not approve
- **Responsibility**: Review all files including logic components for vulnerabilities, unsafe routing rules
- **Additional checks**: ROUTER targets must exist; GATE must use HMAC; ERROR_POLICY must not allow L4 retry
- **Veto Power**: HARD veto — blocks any output from delivery

### LLM Judge Agent
- **Model**: anthropic/claude-opus-4
- **Config**: ./references/llm-judge.md
- **Responsibility**: Score on Correctness, Security, Maintainability, Efficiency (1-5 each)
- **Pass Threshold**: 4/5 on ALL criteria

---

## Orchestration Flow

```
User Input (name + use-case + template + files + logic flags)
              ↓
        [Orchestrator]  ──── logic/ROUTER.md ────► (deterministic pre-routing)
              ↓
        [Architect Agent]
         Design build plan · select logic components
              ↓
        [Developer Worker]
         Generate skill files + logic/ component files
         Compile routing-manifest.json
              ↓
        [Security Officer]
         Review: skills, logic rules, permissions
         Validate: ROUTER targets exist · GATE uses HMAC
              ↓ fail? → Security Debt → Developer (max 3 cycles)
        [LLM Judge]
         Score 4-criterion rubric
              ↓ pass?
        [Orchestrator]
         Package: skills + logic/ + references
         Update MEMORIES.md · Write audit trail
              ↓
         Deliver to user
```

---

## Logic Component Decision Matrix

| Use-Case Pattern | Recommended Components |
|---|---|
| Single request → single skill | None (optional ROUTER) |
| "Audit these N items" | SEQUENCE + ERROR_POLICY |
| Deploy / payment / delete | GATE + ERROR_POLICY |
| Multi-skill chaining | DATA_MAP + ROUTER |
| Unreliable external tools | ERROR_POLICY |
| Complex enterprise workflow | All 5 components |

---

## Working Agreements

1. **Security Officer** has absolute veto power
2. **ROUTER rules** MUST reference skills that exist in .agents/skills/ — validate.sh enforces
3. **GATE state** MUST be persisted to .gates/ — never held in memory
4. **SEQUENCE items** MUST receive clean isolated context — no cross-contamination
5. **MEMORIES.md** updated at end of every session
6. **HITL required** for: file deletion, external API writes, permission scope changes, budget > 80%, revision cycles ≥ 3
7. **Max tool calls**: 50 per run · **Budget ceiling**: $0.50 per run
8. **Audit trail**: append-only, every event — no exceptions

---

## Discovery Prompt Template

```
Scan the .agents/skills directory and read only YAML frontmatter + # Overview.

If logic/ROUTER.md exists: evaluate routing rules BEFORE invoking the LLM.
Deterministic routing always takes precedence over probabilistic skill selection.

Based on: "[INSERT REQUEST HERE]"
Return: filename · reason · confidence (high|medium|low)
```

---

## Sub-Directory Index

| Path | Load By | Load Trigger |
|---|---|---|
| `./logic/ROUTER.md` | Runner | Every request — before LLM |
| `./logic/SEQUENCE.md` | Runner | Batch/array input detected |
| `./logic/GATE.md` | Runner | High-risk action requires approval |
| `./logic/DATA_MAP.md` | Runner | Skill-to-skill data handoff |
| `./logic/ERROR_POLICY.md` | Runner | Any skill failure |
| `./logic/routing-manifest.json` | Runner | Startup — compiled rule index |
| `./agents/architect/INSTRUCTIONS.md` | Architect | Build task initiated |
| `./agents/worker/INSTRUCTIONS.md` | Developer Worker | Architect plan received |
| `./agents/security/INSTRUCTIONS.md` | Security Officer | Worker output ready |
| `./references/guardrails.md` | Guardrail Layer | Any tool call or output |
| `./references/llm-judge.md` | LLM Judge | Pre-delivery evaluation |
| `./references/audit-trails.md` | Audit System | Every event |
