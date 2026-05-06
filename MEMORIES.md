# MEMORIES.md — Session Memory Store
# Ai-Agent Builder · Persistent Cross-Session Context
# Updated automatically at end of every session

version: 1.0.0
last_session: 2025-05-04T00:00:00Z
session_count: 0
schema: memories/v1

---

## Learnings — What Works Well

_This section is populated automatically after each session._
_Agent reads this section before starting any new session._

### Template Selection Patterns
- Users describing "code quality" or "PR review" → ReAct Agent template performs best
- Users describing "security audit" or "vulnerability scan" → Security Squad template
- Users mentioning "team" or "specialized" → Supervisor MAS template
- Users mentioning "documents", "knowledge base", "Q&A" → Agentic RAG template
- First-time users with vague use cases → suggest Quick Fill prompts before proceeding

### Description Field Guidance
- The single most important field for skill activation is `description:` in YAML frontmatter
- Users who write vague descriptions (< 20 words) consistently get poor skill matching
- Best performing descriptions include: primary verb + primary noun + output type
- Example high-performing: "Reviews Python and TypeScript pull requests for security vulnerabilities, generates structured JSON reports with severity scores and remediation steps"

### Build Flow Optimizations
- Validate inputs (name + use-case + template) before starting build — saves tokens
- Generate SKILL.md first — other files derive from it
- Security Officer review catches 80%+ of issues on first pass when guardrails.md is loaded
- LLM Judge rarely fails if Security Officer has already approved

### File Generation Quality
- AGENTS.md quality improves significantly when template roles are explicitly named
- permissions.md is the most commonly misconfigured file — default to least privilege
- eval-golden-set.md benefits from 3+ concrete scenarios, not just schema

---

## Avoid — What Causes Failures

_Patterns that have caused issues — avoid repeating these._

### Common Mistakes
- Do NOT generate SKILL.md with more than 200 lines — agent fails to load it
- Do NOT put heavy reference data in SKILL.md — use ./references/ for anything > 50 lines
- Do NOT skip the Security Officer review step — it catches hardcoded defaults
- Do NOT use passive/negative language in ## Instructions ("do not forget to...") — use affirmative ("always include...")
- Do NOT generate permissions.md with admin scope by default — always start with read_only
- Do NOT mark guardrail_triggered: false in audit events when a guardrail actually fired

### Anti-Patterns in Skill Descriptions
- Avoid: "A skill that helps with things" — too vague, never activates
- Avoid: Descriptions that describe what the skill IS rather than what it DOES
- Avoid: Descriptions longer than 2 sentences in the YAML field (truncated by frontmatter reader)

### Architecture Anti-Patterns
- Single agent handling > 5 diverse tool types → hallucination rate increases significantly
- Skipping stateful graph memory for multi-step tasks → agent loses plan position
- Using temperature > 0.3 for Security Officer agent → inconsistent policy enforcement
- Loading all ./references/ files upfront → wastes 40%+ context window on unused content

---

## User Preferences

_Populated from explicit user instructions across sessions._

```yaml
preferred_model: anthropic/claude-sonnet-4
preferred_judge_model: anthropic/claude-opus-4
default_template: react
default_memory: stateful-graph
default_framework: MCP (Model Context Protocol)
hitl_enabled: true
audit_trail_enabled: true
sandbox_enabled: true
llm_judge_enabled: true
red_team_enabled: false
temperature: 0.1
max_tokens: 4096
```

---

## Session Log

_Last 10 sessions — older entries archived to ./references/session-archive.md_

| Session | Date | Agent Built | Template | Verdict | Files |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

---

## Pending Improvements

_Items identified during sessions that should be addressed in future builds._

- [ ] Add voice assistant template to template library
- [ ] Add import from LangGraph JSON format
- [ ] Add YAML export option alongside Markdown
- [ ] Improve permission scope auto-detection from use-case description
- [ ] Add cost estimation preview before build starts

---

_This file is maintained automatically. Do not edit manually._
_If corrupted, delete this file — it will be regenerated on next session start._
