## Here is the complete accounting of every change made across this v1.2.0 release:

### ai-agent-builder.html — 4 changes
> New "Inline Error Handling" card added to the canvas in the Model Configuration section. Contains four fields: on_fail (primary fallback skill select), on_empty_result (zero-results-specific fallback), on_timeout (wall-clock-specific fallback), and retry_count (retries before invoking fallback). Each select defaults to a sensible "use ERROR_POLICY.md" empty option so the card is non-intrusive for users who don't need it. A Precedence Rule box at the bottom of the card displays: Skill on_fail → ERROR_POLICY.md fallback_chain → circuit breaker — always visible, no tooltip required.

Live SKILL.md preview now shows all four on_fail frontmatter fields (on_fail, on_empty_result, on_timeout, retry_count) in the frontmatter block with their own id span elements. A note in the ## Constraints section reads: "on_fail overrides global ERROR_POLICY.md for this skill." Also added ## Error Handling (Inline) section to the preview showing the resolved values.

Change event listener expanded to sync all four on_fail fields to the live preview in real time. When a field is set to empty (use default), the preview shows a dimmed placeholder text rather than a broken value.
doValidate() gains five new checks: (1) lists all enabled vs disabled logic components, (2) warns if on_fail: hitl-gate is set but the GATE feature flag is off, (3) warns if retry_count: 0 is set, (4) shows the retry count configured, (5) warns if both ERROR_POLICY.md is disabled AND no on_fail is set — meaning the skill has absolutely no fallback coverage.
downloadPackage() reads all four on_fail config values, builds onFailBlock (the YAML frontmatter lines, omitting empty fields), builds onFailConstraint (the human-readable precedence statement for the ## Constraints section), and injects both into the generated SKILL_MD template. The generated SKILL.md includes a full ## Error Handling (Inline) section with comments for unset fields.

### 8 Skill Files — on_fail frontmatter added
Each skill received four new frontmatter keys inserted immediately after max_lines: 200, with values chosen to reflect the skill's domain and risk profile:
Skillon_failon_empty_resulton_timeoutretry_countRationalecode-review.mdbasic-lint-only.mdhitl-gatebasic-lint-only.md2Degrade to deterministic lint, never silently pass zero findingssecurity-audit.mdllm-only-security-review.mdhitl-gatellm-only-security-review.md2Never degrade to reasoning-only — security must stay LLM-reviewed at minimumrag-retrieval.mdreasoning-only.mdhitl-gatereasoning-only.md3Retrieval is worth retrying 3×; zero results needs human confirmationsprint-planner.mdhitl-gatehitl-gatereasoning-only.md1Never silently degrade planning decisionsdata-validator.mdreasoning-only.mdreasoning-only.mdreasoning-only.md2Data validation can degrade to LLM analysis with a warningincident-response.mdhitl-gatereasoning-only.mdhitl-gate1Urgency — fail fast, escalate immediately.agents/skills/SKILL.mdreasoning-only.mdhitl-gatereasoning-only.md2Meta-skill defaultsSKILL.md (root)reasoning-only.mdhitl-gatereasoning-only.md2Root orchestrator defaults

### logic/ERROR_POLICY.md
New section "Skill-Level on_fail Precedence" documenting: the full 4-level precedence stack, all four frontmatter key semantics with detailed descriptions distinguishing on_fail from on_empty_result (empty result ≠ error — these are separate conditions requiring different responses), missing key behavior table (8 rows covering every combination), validate.sh checks, and reserved on_fail values.

### scripts/validate.sh
New Section 8: on_fail frontmatter validation that: iterates every .md file in .agents/skills/, extracts each on_fail key, validates each target is either a reserved value or an existing skill file, validates retry_count is an integer 0–10, and warns if hitl-gate is referenced but logic/GATE.md is not in the package.

### references/audit-trails.md
Six new event types: skill_retry, skill_on_fail_invoked, skill_on_empty_invoked, skill_on_timeout_invoked, skill_fallback_resolved, skill_fallback_failed. Each includes a JSON schema extension with two new required fields — precedence: "skill-level" and error_policy_overridden: true — so compliance auditors can distinguish skill-level fallbacks from global ERROR_POLICY.md fallbacks in audit reports.

### docs/API_REFERENCE.md
Complete on_fail frontmatter reference section: field table with types and defaults, valid target values table, four worked examples (RAG, security audit, incident response, code review), the full decision tree the runner follows, Level 4 FATAL bypass note, validation rules table, and all 6 audit event types.

### agents/security/INSTRUCTIONS.md
On_fail security review checklist with 7 checks covering: target file existence, security-sensitive skill degradation risk (HIGH), hitl-gate without GATE.md (HIGH), on_empty_result logic correctness per skill type, retry_count: 0 warning, retry_count > 5 warning. Severity table with 6 rows.

### agents/worker/INSTRUCTIONS.md
On_fail generation rules: selection-by-skill-type table (7 rows), four numbered generation rules covering key placement, ## Error Handling (Inline) section format, ## Constraints addition, and security flag guidance.

### CHANGELOG.md — v1.2.0
Full entry covering all UI changes, skill file updates, precedence rule, and all 9 documentation files updated.

tests/unit/builder.test.js — ~225 lines / 4 new describe blocks
on_fail Target Validation (reserved values, empty string, known skills, unknown targets), retry_count Validation (0–10 range, non-integers, string parsing), on_fail Precedence Resolution (6 tests covering all combination paths through the decision tree including empty fallthrough to global policy), Skill-Specific on_fail Defaults (all defaults valid, incident has retry_count 1, security never degrades to reasoning-only, sprint-planner escalates to HITL), on_fail + GATE cross-check (4 tests).

tests/integration/e2e.test.js — ~170 lines / 3 new test suites
Suite 10 — Skill file integration: all 6 skills have all 4 keys, values match expected defaults, on_fail appears after max_lines and inside frontmatter, security-sensitive constraints (security audit never reasoning-only, incident HITL, sprint HITL, RAG retry_count 3), retry_count validity for all skills. Suite 11 — Builder HTML integration: all 8 element IDs exist, change listener wired, downloadPackage reads on_fail, doValidate checks on_fail. Suite 12 — Documentation coverage: all 9 updated files contain expected terms.
