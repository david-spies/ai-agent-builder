# ARCHITECTURE.md — Deep-Dive Technical Reference
# Ai-Agent Builder

version: 1.0.0
generated: 2026-05-04

---

## Overview

Ai-Agent Builder is architected as a pure client-side application. There is no server, no database, no authentication service, and no telemetry — by design. All state lives in JavaScript memory. All file generation happens client-side using the Web File API. All agent configuration is downloaded as static `.md` files.

This "backend-less" architecture makes the tool:
- **Invisible to trackers** — no external requests, no cookies, no fingerprinting
- **Lightweight** — a single ~90KB HTML file
- **Unbreakable** — no server to go down, no API to rate-limit, no credentials to rotate

---

## Application Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser (No Server)                         │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    ai-agent-builder.html                     │   │
│  │                                                              │   │
│  │   ┌──────────┐   ┌─────────────────────┐   ┌────────────┐    │   │
│  │   │          │   │                     │   │            │    │   │
│  │   │ SIDEBAR  │   │  CANVAS (MAIN)      │   │   RIGHT    │    │   │
│  │   │          │   │                     │   │   PANEL    │    │   │
│  │   │ Agent    │   │ • Identity Input    │   │            │    │   │
│  │   │ Nav      │   │ • Use Case Editor   │   │ • Live     │    │   │
│  │   │          │   │ • Template Grid     │   │   Preview  │    │   │
│  │   │ Workspace│   │ • File Drop Zone    │   │            │    │   │
│  │   │ Links    │   │ • Skills Registry   │   │ • 4 tabs:  │    │   │
│  │   │          │   │ • Pipeline View     │   │   SKILL/   │    │   │
│  │   │ Stats    │   │ • Model Config      │   │   AGENTS/  │    │   │
│  │   │          │   │ • Feature Flags     │   │   EVAL/    │    │   │
│  │   │          │   │                     │   │   LOG      │    │   │
│  │   └──────────┘   └─────────────────────┘   └────────────┘    │   │
│  │                                                              │   │
│  │   ┌──────────────────────────────────────────────────────┐   │   │
│  │   │                  JavaScript Engine                   │   │   │
│  │   │                                                      │   │   │
│  │   │  STATE      TEMPLATES    BUILD_ENGINE    FILE_GEN    │   │   │
│  │   │  {agents,   {react,      validate()      Blob API    │   │   │
│  │   │   files,    supervisor,  build()         URL.create  │   │   │
│  │   │   template, rag, ...}    finishBuild()   ObjectURL() │   │   │
│  │   │   building}              downloadPkg()               │   │   │
│  │   │                                                      │   │   │
│  │   └──────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                │
                     User clicks "Download"
                                │
                                ▼
              ┌──────────────────────────────┐
              │  Deployment Package (.md)    │
              │  SKILL.md · AGENTS.md        │
              │  guardrails.md · etc.        │
              └──────────────────────────────┘
```

---

## State Management

The application uses a flat JavaScript object as its single source of truth:

```javascript
const S = {
  agents: [                   // All agents in the sidebar
    {
      id: 'uuid',
      name: 'Agent Name',
      dot: 'dot-green|dot-amber|dot-gray',
      built: false
    }
  ],
  activeId: 'uuid',           // Currently active agent
  template: null,             // Selected template ID
  files: [],                  // Uploaded reference files
  building: false,            // Build in progress flag
  built: false,               // Package ready flag
  builtCount: 0,              // Session build count (stats)
  logEntries: []              // Audit log entries
};
```

State mutations happen only through explicit handler functions — never directly. This makes the app predictable and debuggable.

---

## File Generation Architecture

The Build Engine generates 6-12 markdown files using JavaScript template literals, then triggers browser downloads using the Blob API:

```javascript
// File generation pattern
function downloadText(filename, content) {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);     // Create revocable in-memory URL
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();                                 // Trigger browser download dialog
  setTimeout(() => URL.revokeObjectURL(url), 1000);  // Clean up memory
}
```

Files are generated sequentially with 200ms stagger to prevent browser from blocking multiple simultaneous downloads:

```javascript
downloadText(`${slug}-SKILL.md`, SKILL_MD);
setTimeout(() => downloadText(`${slug}-AGENTS.md`, AGENTS_MD), 200);
setTimeout(() => downloadText(`${slug}-guardrails.md`, GUARDRAILS_MD), 400);
// ...
```

---

## Template System

Each template is a JavaScript object defining the full agent configuration:

```javascript
const TEMPLATES = {
  react: {
    name: 'ReAct Agent',
    pattern: 'ReAct (Think → Act → Observe)',
    overview: 'Agent overview text...',
    instructions: ['Step 1', 'Step 2', ...],  // Numbered instruction steps
    roles: `Role definitions for AGENTS.md`,
    pipelineNodes: ['Node1', 'Node2', ...]     // Pipeline visualization
  }
};
```

Template selection triggers:
1. Pipeline re-render with template-specific node labels
2. SKILL.md live preview update
3. AGENTS.md roles section update
4. Topbar badge state change

---

## Progressive Skill Loading — Implementation

The three-prompt pattern is implemented in the generated AGENTS.md and SKILL.md files:

### Level 1: Discovery (Frontmatter Only)
```
Scan: .agents/skills/*.md
Read: YAML frontmatter + # Overview section ONLY
Match: description field against user request
Select: single best match
Load: full file only after selection
```

**Why only frontmatter?** Loading full skill files for every skill in the directory wastes context window tokens. A 10-skill directory with 200 lines each = 2000 lines consumed just for discovery. With frontmatter-only loading, discovery costs ~150 tokens total.

### Level 2: Execution (Full File)
```
Load: selected SKILL.md in full
Obey: ## Instructions exactly
Follow: ## Constraints as hard limits
Output: per ## Output Format schema
Load: ./references/ only when specific step requires it
```

### Level 3: Orchestration (City Map)
```
Load: AGENTS.md (structure + roles + working agreements)
For each sub-task: load agent's INSTRUCTIONS.md
After session: write learnings to MEMORIES.md
Before finish: verify against "Working Agreements" in AGENTS.md
```

---

## Guardrail Integration Architecture

The Interceptor Pattern places guardrails as middleware:

```
Agent Request
     │
     ▼
Layer 1: Input Guardrails (sync, < 1ms)
  - Regex pattern matching (prompt injection)
  - PII scanner
  - Token length check
     │ pass
     ▼
LLM Reasoning (~1-10s)
     │
     ▼ (if tool call)
Layer 2: Execution Guardrails (sync, 50-500ms)
  - Semgrep static analysis
  - detect-secrets scan
  - Sandbox constraint check
     │ pass
     ▼
Tool Execution (variable)
     │
     ▼
Layer 3: Output Guardrails (sync, < 100ms)
  - DLP scan
  - Hallucination detector
  - Cost ceiling check
     │ pass
     ▼
LLM Judge Evaluation (~5-30s)
     │ pass (all criteria ≥ 4/5)
     ▼
Deliver to User
```

**Critical design choice**: Guardrails are deterministic code, not LLM calls. This makes them:
- **Fast**: Regex/AST analysis runs in milliseconds, not seconds
- **Cheap**: No token costs
- **Reliable**: No probabilistic variance — same input always produces same result
- **Auditable**: Every block produces a structured JSON finding with exact rule citation

---

## Multi-Agent State Machine

For Supervisor MAS pattern, the agent interactions follow a state machine:

```
States:
  INIT → ARCHITECT_PLANNING → WORKER_GENERATING →
  SECURITY_REVIEWING → JUDGE_EVALUATING → APPROVED | BLOCKED

Transitions:
  INIT → ARCHITECT_PLANNING
    trigger: build() called with valid inputs

  ARCHITECT_PLANNING → WORKER_GENERATING
    trigger: build_plan generated with ready_to_build: true

  WORKER_GENERATING → SECURITY_REVIEWING
    trigger: all files in generation_order produced

  SECURITY_REVIEWING → WORKER_GENERATING
    trigger: verdict = "BLOCK" AND revision_cycle < 3

  SECURITY_REVIEWING → HITL_GATE
    trigger: revision_cycle >= 3

  SECURITY_REVIEWING → JUDGE_EVALUATING
    trigger: verdict = "APPROVED"

  JUDGE_EVALUATING → WORKER_GENERATING
    trigger: verdict = "Fail" AND reflection_cycle < 2

  JUDGE_EVALUATING → APPROVED
    trigger: verdict = "Pass" AND all scores >= 4

  APPROVED → PACKAGE_ASSEMBLED
    trigger: all files validated, audit trail written

  Any State → ERROR
    trigger: timeout (120s) OR unhandled exception
```

---

## Security Model

### Browser Security
- **No localStorage/sessionStorage**: State is ephemeral — cleared on tab close
- **No eval()**: Zero dynamic code execution in the application
- **No external requests**: All functionality works offline after initial page load
- **Blob URLs**: Files use revocable in-memory URLs, never touch a server
- **CSP-compatible**: Inline styles/scripts work with strict Content-Security-Policy

### Generated File Security
- **No secrets in generated files**: All config uses `os.environ.get()` references
- **Least-privilege defaults**: All generated permissions.md default to `read_only`
- **Guardrails always present**: Every generated package includes all 3 guardrail layers
- **Audit trail always present**: Every generated package includes audit-trails.md

---

## Performance Characteristics

| Metric | Value |
|---|---|
| Initial load time | < 500ms (single file, no CDN) |
| Build animation time | ~4 seconds (12 steps × ~320ms) |
| File generation time | < 100ms (JavaScript template rendering) |
| Download trigger time | < 50ms per file (Blob API) |
| Total build-to-download | < 8 seconds |
| Memory usage | < 20MB (no heavy frameworks) |
| Bundle size | ~90KB (zero dependencies) |

---

## Browser Compatibility

| Browser | Version | Status |
|---|---|---|
| Chrome | 90+ | ✓ Fully supported |
| Firefox | 88+ | ✓ Fully supported |
| Safari | 14+ | ✓ Fully supported |
| Edge | 90+ | ✓ Fully supported |
| IE 11 | any | ✗ Not supported (no ES2022) |

Required APIs: `navigator.clipboard`, `URL.createObjectURL()`, CSS Grid, CSS custom properties.
