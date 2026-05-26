## 50 files total — 1 HTML app + 49 project files. Here is the complete, authoritative directory structure map:

ai-agent-builder/                          ← PROJECT ROOT
│
│  ┌─────────────────────────────────────────────────────┐
│  │  PLACE THIS IN THE ROOT — OPEN DIRECTLY IN BROWSER  │
│  └─────────────────────────────────────────────────────┘
├── ai-agent-builder.html                  ★ THE APPLICATION — single deployable file
│
│  ┌──────────────────────────────────────┐
│  │  ROOT CONFIGURATION FILES            │
│  └──────────────────────────────────────┘
├── SKILL.md                               Root agent skill manifest (agentskills.io standard)
├── AGENTS.md                              Orchestration city map — roles, working agreements
├── MEMORIES.md                            Cross-session persistent memory store
├── README.md                              Master documentation (20 sections, 1,392 lines)
├── CHANGELOG.md                           Version history — v1.0.0 → v1.1.0 → v1.2.0
├── CONTRIBUTING.md                        Contribution guidelines and PR process
├── LICENSE                                MIT License + third-party attributions
├── package.json                           Node project manifest — npm test, lint, eval scripts
└── .gitignore                             Git ignore rules — secrets, node_modules, dist
│
│  ┌──────────────────────────────────────┐
│  │  .agents/skills/   ← SKILL LIBRARY   │
│  │  Discovery target for all agents     │
│  └──────────────────────────────────────┘
├── .agents/
│   └── skills/
│       ├── SKILL.md                       Meta-skill — teaches agents to write SKILL.md files
│       ├── code-review.md                 Code review skill (on_fail: basic-lint-only.md)
│       ├── security-audit.md             Security audit skill (on_fail: llm-only-security-review.md)
│       ├── sprint-planner.md              Sprint planning skill (on_fail: hitl-gate)
│       ├── data-validator.md              Data pipeline validation skill (on_fail: reasoning-only.md)
│       ├── rag-retrieval.md               Agentic RAG skill (on_fail: reasoning-only.md, retry: 3)
│       └── incident-response.md           Incident triage skill (on_fail: hitl-gate, retry: 1)
│
│  ┌──────────────────────────────────────────────────────┐
│  │  logic/   ← DETERMINISTIC LOGIC COMPONENTS           │
│  │  Runner interprets these — builder stays backend-less│
│  └──────────────────────────────────────────────────────┘
├── logic/
│   ├── ROUTER.md                          Deterministic pre-LLM routing (regex/JSON path rules)
│   ├── SEQUENCE.md                        Batch iterator controller (clean context per item)
│   ├── GATE.md                            HITL durable checkpoint (HMAC-signed, survives restarts)
│   ├── DATA_MAP.md                        Cross-skill JSON field mapper (explicit wiring)
│   ├── ERROR_POLICY.md                    Retry, fallback chains, circuit breaker + on_fail precedence
│   └── routing-manifest.json             Compiled rule index — read by runner at startup
│
│  ┌──────────────────────────────────────────────────────┐
│  │  references/   ← LOAD ON-DEMAND ONLY                 │
│  │  Heavy config — never loaded upfront                 │
│  └──────────────────────────────────────────────────────┘
├── references/
│   ├── guardrails.md                      3-layer runtime safety (input/execution/output)
│   ├── llm-judge.md                       LLM-as-Judge rubric + golden set schema
│   ├── audit-trails.md                    Audit event schema + on_fail event types
│   ├── governance.md                      Compliance policies, change management, incident response
│   ├── permissions.md                     RBAC scopes, tool permissions, logic component rights
│   └── versioning.md                      Semver rules, version manifest, rollback procedures
│
│  ┌──────────────────────────────────────┐
│  │  agents/   ← AGENT ROLE CONFIGS      │
│  └──────────────────────────────────────┘
├── agents/
│   ├── architect/
│   │   └── INSTRUCTIONS.md               Architect — decompose, plan, select logic components
│   ├── worker/
│   │   └── INSTRUCTIONS.md               Developer Worker — generate all .md + logic files
│   └── security/
│       └── INSTRUCTIONS.md               Security Officer — adversarial review + on_fail checklist
│
│  ┌──────────────────────────────────────────────────────┐
│  │  evals/   ← EVALUATION & RED TEAM                    │
│  └──────────────────────────────────────────────────────┘
├── evals/
│   ├── golden-set/
│   │   ├── README.md                      Golden set documentation + how to add scenarios
│   │   ├── general.json                   10 general capability eval scenarios
│   │   ├── code-review.json               6 code review eval scenarios (true pos + false pos)
│   │   └── security.json                  8 security audit eval scenarios (OWASP, CVEs)
│   └── red-team/
│       ├── README.md                      Red team documentation + scoring reference
│       ├── prompt-injection.md            10 injection probes (RT-PI-001 → RT-PI-010)
│       ├── credential-theft.md            10 credential theft probes (RT-CT-001 → RT-CT-010)
│       └── permission-escalation.md       12 escalation probes (RT-PE-001 → RT-PE-012)
│
│  ┌──────────────────────────────────────┐
│  │  scripts/   ← DEVELOPER TOOLING      │
│  └──────────────────────────────────────┘
├── scripts/
│   ├── validate.sh                        Pre-build validator (8 check sections + on_fail validation)
│   ├── package.sh                         Package builder — dev/staging/production canary deploy
│   ├── eval-runner.sh                     Eval framework shell wrapper (bash entry point)
│   └── eval-runner.py                     Eval framework Python runner (Tier A + LLM Judge + baseline)
│
│  ┌──────────────────────────────────────┐
│  │  docs/   ← EXTENDED DOCUMENTATION    │
│  └──────────────────────────────────────┘
├── docs/
│   ├── ARCHITECTURE.md                    Deep-dive: state management, file gen, progressive loading
│   ├── SKILL_AUTHORING.md                 Complete guide — description formula, 4 worked examples
│   ├── DEPLOYMENT.md                      8 deployment targets (file://, Docker, S3, Claude Code...)
│   └── API_REFERENCE.md                   Complete config reference + on_fail frontmatter spec
│
│  ┌──────────────────────────────────────┐
│  │  tests/   ← TEST SUITE               │
│  └──────────────────────────────────────┘
└── tests/
    ├── unit/
    │   └── builder.test.js                1,000 lines — 7 describe blocks, logic + on_fail tests
    └── integration/
        └── e2e.test.js                    1,088 lines — 12 test suites, full project coverage




Three things to do after placing all files
1. Make scripts executable:
bashchmod +x ai-agent-builder/scripts/*.sh
2. Install Node dependencies (only needed for npm test):
bashcd ai-agent-builder
npm install
3. Show hidden files in your file manager or terminal to see .agents/ and .gitignore — these start with a dot and are hidden by default on macOS and Linux. On macOS: Cmd+Shift+. in Finder. In terminal: ls -la.
