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
