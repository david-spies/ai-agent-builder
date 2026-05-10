# CHANGELOG

All notable changes to Ai-Agent Builder are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Voice assistant agent template
- Import from LangGraph JSON / CrewAI YAML
- YAML + TOML export formats
- Dark/light mode toggle
- Accessibility improvements (ARIA labels, full keyboard nav)
- Cost estimation preview before build

---

## [1.0.0] — 2026-05-04

### Added
- Initial release of Ai-Agent Builder
- Single-file, zero-dependency, browser-native application
- 6 agent templates: ReAct, Supervisor MAS, Agentic RAG, Security Squad, Swarm, Custom
- 8 quick-fill use-case prompts
- Drag-and-drop reference file ingestion (.md, .txt, .docx)
- Auto-detection of skill tags from use-case keywords
- 3-panel layout: Sidebar / Canvas / Output Preview
- Live SKILL.md preview with frontmatter sync
- AGENTS.md city-map preview
- LLM-as-Judge rubric panel (Correctness, Security, Maintainability, Efficiency)
- Audit trail log panel with timestamped events
- Animated 12-step build progress
- Validation report with per-field status indicators
- Guardrails configuration modal (Input / Execution / Output layers)
- Model configuration: provider, tokens, temperature, memory strategy, framework
- Feature flags: HITL, audit trail, multi-agent, Agentic RAG, LLM Judge, sandbox, red team
- 6 downloaded output files: SKILL.md, AGENTS.md, guardrails.md, llm-judge.md, audit-trails.md, README.md
- Keyboard shortcuts: Cmd+Enter (build), Cmd+K (validate), Esc (close modal)
- Notification system with auto-dismiss
- Multi-agent sidebar with agent switching
- Stats sidebar footer (agents built, files loaded, skills generated)
- Zero backend, zero tracking, zero external requests
- agentskills.io open standard compliance

### Architecture
- Three-prompt pattern: Discovery → Execution → Orchestration
- Six-layer pipeline: Perception → Planning → Memory → Execution → Evaluation → Guardrails
- Progressive skill loading (frontmatter → full file → references on-demand)
- Security Officer adversarial review loop
- LLM-as-Judge with structured JSON rubric
- Red team adversarial eval set generation

---

## Version Naming Convention

```
MAJOR.MINOR.PATCH

MAJOR — Breaking changes to generated file schema or agent interface
MINOR — New templates, new generated files, new feature flags
PATCH — Bug fixes, UI improvements, documentation updates
```

---

## [1.1.0] — 2025-05-04

### Added — Logic Components (Deterministic Orchestration Layer)
- `logic/ROUTER.md` — Deterministic traffic controller with regex, JSON path, and keyword routing rules evaluated before any LLM invocation
- `logic/SEQUENCE.md` — Batch iterator controller processing arrays item-by-item with clean isolated context per item, checkpointing, and configurable error handling
- `logic/GATE.md` — Durable HITL checkpoint persisted to `.gates/{uuid}.json`, surviving process restarts, with HMAC-signed callback URL approval
- `logic/DATA_MAP.md` — Cross-skill JSON field mapper with JSONPath expressions, type coercion, sandboxed transform expressions, and required-field enforcement
- `logic/ERROR_POLICY.md` — Multi-step recovery with 5 error levels, exponential backoff, fallback skill chains, and per-skill circuit breakers
- `logic/routing-manifest.json` — Compiled rule index read by runner at startup; regenerated on every `package.sh` build

### Added — Builder UI
- LOGIC tab in right panel — live preview of all 5 logic component configurations
- Logic Components card in canvas — 5 visual chips (◈ ROUTER, ⟳ SEQUENCE, 🔐 GATE, ⇄ DATA MAP, ⚡ ERROR POLICY) synced to feature flag toggles
- 6 new feature flag toggles: Deterministic Router, Batch Iterator, GATE durable HITL, Cross-skill Data Mapper, Error Policy + Circuit Breaker (Red team already existed)
- 2 new quick-fill prompts: "Batch Audit" and "Routed Workflow"
- Build steps expanded from 12 to 18 (6 logic component generation steps added)
- `downloadPackage()` now generates all enabled logic component files + `routing-manifest.json`
- `showBuildCompleteModal()` groups output files by section including Logic Components
- `doValidate()` now checks: logic component configuration, HITL↔GATE cross-check, router target existence warning
- `syncLogicChips()` — new function keeping feature flag toggles and logic chip visuals in sync

### Updated
- `AGENTS.md` — added logic/ directory to city map, logic component decision matrix, updated working agreements and orchestration flow
- `scripts/validate.sh` — validates component_type fields, routing-manifest.json JSON validity, all ROUTER target skills exist in .agents/skills/, GATE HMAC verification
- `MEMORIES.md` — added logic component learnings section
- `agents/architect/INSTRUCTIONS.md` — logic component selection added to planning step
- `agents/worker/INSTRUCTIONS.md` — logic component file generation added to responsibilities
- `agents/security/INSTRUCTIONS.md` — logic component security review added to checklist
- `references/audit-trails.md` — new event types: routing_decision, item_start, item_complete, batch_complete, hitl_modified, data_mapped, circuit_open, circuit_closed, degraded_mode
- `references/permissions.md` — GATE approval roles and SEQUENCE budget impact documented
- `tests/unit/builder.test.js` — logic component constant tests added
- `tests/integration/e2e.test.js` — logic/ directory existence and structure tests added
