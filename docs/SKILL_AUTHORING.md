# SKILL_AUTHORING.md — Complete Guide to Writing Agent Skills
# Ai-Agent Builder · Documentation

version: 1.0.0
generated: 2026-05-04

---

## Introduction

A Skill is not a plugin. It is not a script. Think of it as an onboarding guide for a new team member — instead of re-explaining your workflows in every conversation, you package them once and the agent picks them up automatically whenever your request matches.

This guide covers everything from file structure and frontmatter rules to the psychology of writing descriptions that actually trigger, with worked examples at four complexity levels.

---

## The SKILL.md Standard

Skill files follow the [agentskills.io](https://agentskills.io/home) open standard, published by Anthropic in December 2025. The format works across Claude Code, OpenAI Codex, and OpenClaw. A skill that works on one platform will very likely work on others — the language is shared, though runtime behaviors (session snapshotting, tool permissions, invocation modes) differ between platforms.

---

## Anatomy of a SKILL.md File

```
.agents/skills/your-skill-name/
├── SKILL.md            ← Required: the only mandatory file
├── scripts/            ← Optional: executable scripts the agent runs
├── references/         ← Optional: heavy data loaded only on demand
└── assets/             ← Optional: templates, images, static files
```

The only required file is `SKILL.md`. Everything else is optional and loaded progressively.

### Full SKILL.md Template

```markdown
---
name: skill-kebab-case-name
version: 1.0.0
description: [PRIMARY VERB] [PRIMARY OBJECT] for [DOMAIN/CONTEXT]. [OUTPUT TYPE] with [KEY FEATURES]. Activates when [TRIGGER CONDITIONS].
template: react|supervisor|rag|security|swarm|custom
model: anthropic/claude-sonnet-4
max_tokens: 4096
temperature: 0.1
memory: stateful-graph
scope: read_only
max_lines: 200
generated: YYYY-MM-DD
---

# Overview

2-3 sentences expanding on the description. What does this skill do? When should it activate? What makes it different from related skills?

## Instructions

1. First step — use affirmative language
2. Second step — be specific about tool names, file paths, exact formats
3. Third step — include error handling ("If X fails, then Y")
4. Continue for all steps
5. Final step — always define what "done" looks like

## Constraints
- No hallucinations: if a required step is not defined in this file, ask for clarification — do not guess
- This file takes precedence over model general training data
- Keep this file under 200 lines — heavy reference data goes in ./references/
- [Add skill-specific constraints here]

## Output Format
\`\`\`json
{
  "result": "<primary output>",
  "confidence": 0.0,
  "sources": [],
  "next_actions": [],
  "audit_id": "<uuid>"
}
\`\`\`

## References
- ./references/[file].md  ← Load only when [specific condition]
```

---

## The Description Field — The Most Important Line You'll Write

### Why It Matters

The `description:` field is the ONLY thing the discovery prompt reads to decide whether to activate your skill. When a user makes a request, the agent scans every skill's frontmatter and compares `description:` values to the request. It loads the SINGLE most relevant skill — or none at all.

Your instructions, constraints, and output format are irrelevant if the skill never activates.

### The Discovery Prompt (What Actually Reads Your Description)

```
Scan the .agents/skills directory and read only the YAML frontmatter
and # Overview section of each .md file.

Based on my request: "[USER REQUEST]", identify the single most
relevant skill. Return the filename and reason based on its
description field.
```

The agent reads your `description:` and asks: "Is this what the user is asking for?"

### The Formula

```
[Primary verb] + [primary object] + for [domain] + [output type] + [key differentiators]
```

**Primary verb**: What does the skill DO? (Reviews, Generates, Analyzes, Monitors, Triages, Validates, Transforms, Optimizes)

**Primary object**: What does it operate on? (Python code, pull requests, data pipelines, sprint tickets, API logs, security findings)

**Domain**: What context makes this skill relevant? (for Python microservices, in CI/CD pipelines, for frontend React components)

**Output type**: What does it produce? (structured JSON report, Jira-ready task list, markdown summary, git diff, alert payload)

**Key differentiators**: What makes this skill different from a generic one? (with severity scores, with policy citations, with automated remediation steps)

### Worked Examples — Before & After

**Code Review Skill**

| ❌ Before | ✅ After |
|---|---|
| `description: A skill for reviewing code` | `description: Reviews Python and TypeScript pull requests for security vulnerabilities, PEP8 violations, and naming convention issues. Generates structured JSON reports with per-finding severity scores (CRITICAL/HIGH/MEDIUM/LOW) and specific remediation steps. Activates for PR review, code audit, and security scan requests.` |

**Sprint Planning Skill**

| ❌ Before | ✅ After |
|---|---|
| `description: Helps plan sprints` | `description: Decomposes product requirements and feature requests into Jira-ready sprint tasks with complexity estimates (story points), dependency mapping, acceptance criteria, and definition of done. Outputs a structured sprint board JSON ready for team import. Activates for sprint planning, backlog grooming, and task decomposition requests.` |

**Data Pipeline Skill**

| ❌ Before | ✅ After |
|---|---|
| `description: Validates data` | `description: Monitors and validates data pipeline outputs for schema drift, null rate anomalies, row count deviations, and statistical outliers. Generates structured incident reports with affected table names, row counts, expected vs. actual values, and recommended remediation actions. Activates for data quality, pipeline validation, and schema drift alerts.` |

### Common Description Mistakes

1. **Describing what the skill IS instead of what it DOES**
   - ❌ `description: A comprehensive code quality tool`
   - ✅ `description: Analyzes Python source files for code quality issues`

2. **Missing the output type**
   - ❌ `description: Reviews security vulnerabilities in Python code`
   - ✅ `description: Reviews Python code for OWASP Top 10 vulnerabilities. Generates structured JSON findings with CVE references, exploit likelihood scores, and remediation code snippets.`

3. **Too long (gets truncated)**
   - The frontmatter reader has a ~300 character limit on field values
   - Keep description under 280 characters for safety

4. **Too short (too vague)**
   - Under 30 characters almost never activates reliably
   - Aim for 80-200 characters

5. **Wrong tense / passive voice**
   - ❌ `description: Code review is performed...`
   - ✅ `description: Reviews code for...`

---

## Writing Effective Instructions

### Affirmative Language

Agents follow positive instructions ("always include X") more reliably than negative instructions ("never forget X" or "don't do Y").

| ❌ Negative | ✅ Affirmative |
|---|---|
| `Don't hallucinate citations` | `Cite only sources explicitly present in the provided context` |
| `Avoid being verbose` | `Limit response to the fields defined in ## Output Format exactly` |
| `Don't skip validation` | `Validate every output field against the JSON schema before returning` |
| `Never hardcode credentials` | `Always retrieve credentials via os.environ.get() or a vault client` |
| `Don't forget to log` | `Write an audit trail entry for every tool call and decision` |

### Specificity Over Generality

Vague instructions produce vague outputs. Be specific about tools, paths, formats, and exit conditions.

| ❌ Vague | ✅ Specific |
|---|---|
| `Search for relevant information` | `Search the ./knowledge-base/ vector collection using semantic similarity. Query terms: extracted entities from user request.` |
| `Check for security issues` | `Run Semgrep with the p/python-security ruleset. Run detect-secrets with all plugins enabled. Flag any MEDIUM+ severity finding.` |
| `Format the output` | `Return a JSON object matching the schema in ## Output Format exactly. All string fields must be non-empty. Confidence must be 0.0-1.0.` |
| `Handle errors` | `If a tool call fails, retry once with the same arguments. If it fails twice, log the error and return {"error": "tool_name failed", "fallback": true}` |

### Defining "Done"

Every instruction set must include a clear terminal condition — how does the agent know when it's finished?

```markdown
## Instructions

1. Parse user request and extract: entity names, action type, time range
2. Query vector DB for relevant context chunks (max 10 results)
3. Evaluate context sufficiency: does it cover the entity + time range?
4. If insufficient: reformulate query with synonyms and re-query (max 2 retries)
5. Synthesize answer from approved context only
6. Verify every factual claim maps to a specific source chunk
7. **DONE when**: Output JSON is complete, all sources cited, confidence score set
```

---

## The Three-Level Loading Pattern

### Why Progressive Loading Matters

Loading everything upfront is the most common cause of poor agent performance. A skill directory with 8 skills at 200 lines each = 1,600 lines consumed before a single word of the user's task is processed. On a 200K context window, that's 1.6% gone. On a 128K context window with a complex task, it can push important task context out.

```
Level 1: Discovery (< 5 tokens per skill)
  Read: YAML frontmatter + # Overview only
  Purpose: Select the right skill
  When: Always, before anything else

Level 2: Execution (200 lines max)
  Read: Full SKILL.md
  Purpose: Understand how to do the task
  When: After skill is selected

Level 3: References (on-demand only)
  Read: ./references/*.md
  Purpose: Detailed data needed for specific steps
  When: Only when a specific instruction step requires it
```

### Structuring References Correctly

```markdown
## References

# Load these only when the specific condition is met:
- ./references/security-policy.md     ← Load when output contains code
- ./references/naming-conventions.md  ← Load when reviewing naming issues
- ./references/test-templates.md      ← Load when generating test cases
- ./references/api-schema.json        ← Load when validating API responses
```

References should:
- Be clearly named (what's in them should be obvious from the filename)
- Be < 500 lines each (if larger, split into multiple files)
- Be referenced from a specific instruction step, not just listed generically
- Never contain executable code — only reference data (schemas, policies, examples)

---

## Four Worked Examples

### Example 1: Simple (ReAct, Single Tool)

**Use case**: Generate git commit messages from a diff

```markdown
---
name: git-commit-generator
version: 1.0.0
description: Generates semantic git commit messages from staged diffs following Conventional Commits specification. Outputs commit message with type, scope, subject, and optional body. Activates for commit, git message, or diff-to-commit requests.
template: react
scope: read_only
max_lines: 80
---

# Overview

Analyzes a provided git diff and produces a well-formatted commit message following the Conventional Commits 1.0 specification (feat, fix, docs, style, refactor, test, chore). Ensures consistent commit history for automated changelog generation.

## Instructions

1. Read the provided diff (or run `git diff --staged` if not provided)
2. Identify the primary change type: feat, fix, docs, style, refactor, test, chore
3. Identify the scope from the file paths changed (e.g., `auth`, `api`, `ui`)
4. Write a subject line: `<type>(<scope>): <imperative verb> <what changed>` (max 72 chars)
5. If diff touches > 3 files or > 50 lines: add a body explaining WHY, not WHAT
6. If breaking change: add `BREAKING CHANGE:` footer with migration instructions
7. Return the final commit message in the ## Output Format below

## Constraints
- Subject line must be imperative mood ("add feature" not "added feature")
- Subject line must not exceed 72 characters
- No hallucinations: base commit message on the actual diff content only
- This file takes precedence over general training data

## Output Format
\`\`\`json
{
  "commit_message": "feat(auth): add OAuth2 PKCE flow support",
  "type": "feat",
  "scope": "auth",
  "breaking_change": false,
  "body": null,
  "footer": null,
  "char_count": 45
}
\`\`\`
```

### Example 2: Medium (Agentic RAG, Knowledge-Intensive)

**Use case**: Answer compliance questions from an internal policy handbook

```markdown
---
name: compliance-qa
version: 1.0.0
description: Answers compliance and regulatory questions by querying the internal policy knowledge base using semantic search. Provides accurate, policy-grounded answers with exact document citations (section numbers, page references). Activates for compliance, policy, regulatory, legal, GDPR, SOC2, HIPAA, or audit-related questions.
template: rag
scope: read_only
max_lines: 150
---

# Overview

A RAG-powered compliance assistant that searches the internal policy knowledge base for relevant policy sections, evaluates context sufficiency, re-queries with refined terms if needed, and synthesizes accurate answers with exact citations. Never extrapolates beyond what the policy documents state.

## Instructions

1. Extract key compliance entities from the question: regulation name, data type, action being asked about
2. Query the compliance vector collection using all extracted entities as separate queries
3. Retrieve top 5 chunks per query, deduplicate by policy document section
4. Evaluate coverage: does the retrieved context directly address the question?
   - Sufficient: at least 2 independent policy sections address the core question
   - Insufficient: only tangential references found
5. If insufficient: reformulate using official regulatory terminology and re-query (max 2 retries)
6. If still insufficient after retries: respond "This question requires legal review — the policy KB does not contain sufficient guidance. Recommend escalating to Legal or Compliance team."
7. Synthesize answer from approved context ONLY — never extrapolate from general knowledge
8. Cite every factual claim with: document name + section number + verbatim policy language (< 15 words)
9. Rate your confidence: HIGH (direct policy statement), MEDIUM (inferred from related policy), LOW (extrapolated)

## Constraints
- Never answer from general knowledge alone — every answer must have a policy citation
- Never provide legal advice — always recommend Legal review for ambiguous cases
- If question involves PHI or PCI-DSS: flag automatically for legal review regardless of confidence
- Max 3 re-query attempts before escalation response
- This file takes precedence over general training data

## Output Format
\`\`\`json
{
  "answer": "string — direct answer to the question",
  "confidence": "HIGH|MEDIUM|LOW",
  "citations": [
    {
      "document": "Data Retention Policy v3.2",
      "section": "§4.1.2",
      "excerpt": "Customer PII must be deleted within 30 days of account closure",
      "relevance": "directly answers retention period question"
    }
  ],
  "escalate_to_legal": false,
  "escalation_reason": null,
  "sources_queried": 3,
  "context_chunks_reviewed": 12
}
\`\`\`

## References
- ./references/policy-index.md     ← Load to understand document structure and collection names
- ./references/regulatory-terms.md ← Load when question contains unfamiliar regulatory acronyms
```

### Example 3: Complex (Security Squad, Multi-Agent)

**Use case**: Full security audit of a Python service

```markdown
---
name: python-security-audit
version: 1.0.0
description: Performs comprehensive security audits of Python services. Runs static analysis (Semgrep, Bandit, detect-secrets), dependency vulnerability scanning, OWASP Top 10 checks, and LLM-based semantic code review. Generates structured findings reports with CVE references, exploit likelihood, CVSS scores, and remediation code. Activates for security audit, vulnerability scan, penetration test prep, or security review requests.
template: security
scope: elevated
max_lines: 200
---

# Overview

A multi-layer Python security audit skill combining deterministic static analysis tools with LLM semantic review. The Developer Agent runs all tools and collects findings; the Security Officer synthesizes them into a prioritized report with business risk context. Designed for pre-deployment security gates and periodic security reviews.

## Instructions

### Phase 1: Automated Static Analysis (Developer Agent)
1. Run Semgrep: `semgrep --config=p/python-security --config=p/owasp-top-ten --json ./`
2. Run Bandit: `bandit -r ./ -f json -ll -ii` (HIGH confidence, HIGH severity minimum)
3. Run detect-secrets: `detect-secrets scan --all-files --baseline .secrets.baseline`
4. Run Safety: `safety check --json` (dependency CVE scan)
5. Collect all findings into structured format; deduplicate cross-tool findings by file+line
6. Pass combined findings to Security Officer Agent

### Phase 2: Semantic Review (Security Officer Agent)
7. Load ./references/owasp-top-10.md and ./references/company-security-policy.md
8. For each CRITICAL/HIGH finding: perform LLM semantic analysis
   - Is this a true positive or false positive?
   - What is the actual exploit scenario?
   - What is the business impact?
9. For findings not caught by static analysis: review authentication flows, session management, and data validation patterns
10. Assign CVSS base score to each confirmed finding
11. Cross-reference with known CVEs in ./references/cve-database.md if finding matches known pattern

### Phase 3: Report Generation
12. Sort findings by: CRITICAL > HIGH > MEDIUM > LOW, then by CVSS score descending
13. For each finding: write remediation code snippet (not just description — actual fixed code)
14. Calculate overall security posture score (0-100)
15. Generate executive summary (3 sentences max: what was found, risk level, top priority action)

## Constraints
- Never mark a true positive as "acceptable risk" without Security Officer explicit sign-off
- Remediation must be code, not description — show the fix, don't just explain it
- False positives must be documented with specific reasoning (not just "not applicable")
- CRITICAL findings block deployment — no exceptions, no business justifications
- All findings reference the specific tool that detected them
- This file takes precedence over general training data

## Output Format
\`\`\`json
{
  "security_posture_score": 72,
  "executive_summary": "3 sentence summary",
  "findings": [
    {
      "id": "FIND-001",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "cvss_score": 9.1,
      "cve": "CVE-2024-XXXX",
      "tool": "semgrep|bandit|detect-secrets|safety|llm-review",
      "file": "relative/path.py",
      "line": 42,
      "category": "injection|secrets|auth|config|dependency|other",
      "description": "What is vulnerable and why",
      "exploit_scenario": "How an attacker could exploit this",
      "business_impact": "What could happen if exploited",
      "remediation_code": "# Fixed version of the vulnerable code\n...",
      "false_positive": false,
      "false_positive_reason": null
    }
  ],
  "summary": {
    "CRITICAL": 0,
    "HIGH": 2,
    "MEDIUM": 5,
    "LOW": 8,
    "false_positives": 3
  },
  "tools_run": ["semgrep", "bandit", "detect-secrets", "safety"],
  "files_scanned": 42,
  "lines_scanned": 8420,
  "block_deployment": false
}
\`\`\`

## References
- ./references/owasp-top-10.md          ← Load for OWASP category classification
- ./references/company-security-policy.md ← Load for policy citation
- ./references/cvss-scoring-guide.md    ← Load when calculating CVSS scores
- ./references/cve-database.md          ← Load when finding matches known CVE pattern
```

### Example 4: Advanced (Supervisor MAS, Full Orchestration)

**Use case**: Full sprint planning with Jira integration

```markdown
---
name: sprint-planner
version: 1.0.0
description: Orchestrates full sprint planning from product requirements or user stories. Decomposes epics into tasks, estimates complexity with story points, maps dependencies, assigns to team roles, identifies risks, and creates Jira-ready sprint board JSON. Activates for sprint planning, backlog grooming, agile planning, story decomposition, or capacity planning requests.
template: supervisor
scope: read_write
max_lines: 200
---

# Overview

A Supervisor MAS sprint planner with three specialized agents: the Architect decomposes requirements into technical tasks, the Estimator scores complexity and risk, and the Coordinator assigns tasks and identifies blockers. Produces a complete sprint package ready for team review and Jira import.

## Instructions

### Architect Agent: Requirements Decomposition
1. Parse all provided user stories, epics, or feature descriptions
2. For each epic: decompose into 3-8 discrete technical tasks (avoid micro-tasks < 0.5 points)
3. For each task: define acceptance criteria (at least 2 testable conditions)
4. Identify dependencies: which tasks must complete before others can start?
5. Flag ambiguous requirements (< 30 words, no acceptance criteria) for clarification

### Estimator Agent: Complexity Scoring
6. Score each task using modified Fibonacci: 1, 2, 3, 5, 8, 13, 21 (story points)
7. Reference: 1 pt = 2-4 hours for a mid-level engineer with no blockers
8. Flag any task > 13 points — it should be split further
9. Identify technical risk: HIGH (new technology, external dependency, no prior art)
10. Calculate total sprint capacity (default: 40 points per developer per 2-week sprint)
11. Flag capacity overruns: > 80% of sprint capacity = WARNING, > 100% = BLOCK

### Coordinator Agent: Assignment & Risk
12. Load ./references/team-roster.md for current team skills and availability
13. Assign each task to the team member with matching skills and available capacity
14. Mark unassigned tasks (capacity shortage or skills gap) explicitly
15. Identify blockers: external API dependencies, pending designs, legal review needs
16. Produce risk register: probability (H/M/L) × impact (H/M/L) for top 5 risks

### Final Packaging
17. Validate sprint: total assigned points ≤ team capacity
18. Verify all tasks have: title, description, acceptance criteria, points, assignee, labels
19. Generate Jira import JSON per the schema in ## Output Format
20. Generate sprint summary card (1 paragraph, appropriate for stakeholder email)

## Constraints
- Never assign a task without checking team capacity — capacity overrun is a blocker
- Every task must have at least 2 acceptance criteria — stories without them stay in backlog
- Tasks > 13 points must be flagged for splitting — never put them in the sprint as-is
- If team roster unavailable: mark all tasks unassigned and flag for manual review
- This file takes precedence over general training data

## Output Format
\`\`\`json
{
  "sprint_name": "Sprint 42 — May 5-19, 2025",
  "summary": "Stakeholder-ready paragraph",
  "capacity": { "total_points": 80, "assigned_points": 72, "utilization_pct": 90 },
  "tasks": [
    {
      "id": "TASK-001",
      "epic": "User Authentication",
      "title": "Implement OAuth2 PKCE flow",
      "description": "Detailed technical description",
      "acceptance_criteria": ["AC1: User can log in via Google OAuth", "AC2: Token refreshed automatically before expiry"],
      "story_points": 5,
      "assignee": "alice@team.com",
      "labels": ["backend", "security", "sprint-42"],
      "dependencies": ["TASK-000"],
      "risk": "MEDIUM",
      "blocker": null,
      "jira_ready": true
    }
  ],
  "risks": [
    {
      "description": "Third-party OAuth provider API rate limits",
      "probability": "LOW",
      "impact": "HIGH",
      "mitigation": "Implement token caching to reduce API calls by 80%"
    }
  ],
  "unassigned_tasks": [],
  "flagged_for_splitting": [],
  "flagged_for_clarification": [],
  "jira_import_ready": true
}
\`\`\`

## References
- ./references/team-roster.md      ← Load for capacity and skill matching
- ./references/jira-schema.json    ← Load for exact Jira import field names
- ./references/definition-of-done.md ← Load when validating acceptance criteria
```

---

## Testing Your Skill

### 1. Description Test

Read your description cold — as if you've never seen it before. Ask:
- Would I know exactly when to use this skill from the description alone?
- Does it include a verb, an object, a domain, and an output type?
- Is it under 280 characters?

### 2. Discovery Test

Write 5 user requests that should trigger this skill. Write 5 that should NOT. Run both sets through the discovery prompt and check activation rate. Target: 5/5 correct activations on the "should trigger" set.

### 3. Instruction Coverage Test

For each instruction step, ask:
- Is this step testable? (Can I write an assertion for it?)
- Is it specific enough? (Does it name tools, paths, formats?)
- Does it use affirmative language?
- Does it handle the error case?

### 4. Output Format Validation

```python
import json
# Paste your ## Output Format JSON here
test_output = """{ "result": "test", "confidence": 0.9, ... }"""
parsed = json.loads(test_output)  # Must not raise
assert "result" in parsed
assert "confidence" in parsed
print("Output format is valid JSON")
```

### 5. Line Count Check

```bash
wc -l .agents/skills/your-skill/SKILL.md
# Must be ≤ 200
# If > 200: move content to ./references/
```
