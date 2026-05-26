---
name: code-review
version: 1.0.0
description: Reviews Python and TypeScript pull requests for security vulnerabilities, PEP8/ESLint violations, naming convention issues, and architectural anti-patterns. Generates structured JSON reports with per-finding severity scores (CRITICAL/HIGH/MEDIUM/LOW), CWE references, and specific remediation code. Activates for PR review, code audit, code quality, diff review, or static analysis requests.
template: security
model: anthropic/claude-sonnet-4
scope: read_only
max_lines: 200
generated: 2026-05-04
---

# Overview

A multi-pass code review skill combining deterministic linting with LLM semantic analysis. Pass 1 runs automated tools (ESLint, Pylint, detect-secrets). Pass 2 performs architectural and security semantic review. Produces a prioritized findings report with inline remediation code, not just descriptions.

## Instructions

1. Identify language(s) from file extensions in the provided diff or file list
2. **Pass 1 — Deterministic checks** (simulate or request tool output):
   - Python: run Pylint for style, Bandit for security, detect-secrets for credentials
   - TypeScript/JS: run ESLint with security plugin, detect-secrets
   - Any language: check for hardcoded IPs, URLs, magic numbers, commented-out code blocks
3. **Pass 2 — Semantic review** (LLM analysis):
   - Authentication and authorization: are endpoints protected? are roles checked?
   - Input validation: is user-supplied data sanitized before use in SQL, shell, HTML?
   - Error handling: are exceptions caught and logged without leaking stack traces to client?
   - Naming conventions: do functions, variables, and classes follow the project's conventions?
   - Dead code: are there unused imports, unreachable branches, or stale TODOs > 90 days?
4. Cross-reference all findings against ./references/naming-conventions.md if provided
5. Deduplicate: if two tools flag the same line for the same reason, merge into one finding
6. Sort findings: CRITICAL → HIGH → MEDIUM → LOW, then by file path alphabetically
7. For every finding with severity CRITICAL or HIGH: write the fixed code, not just a description
8. Calculate overall code quality score (0–100): start at 100, subtract per severity (CRITICAL −20, HIGH −10, MEDIUM −3, LOW −1)
9. Write executive summary: 2 sentences max — overall verdict and single most important action
10. Return JSON per ## Output Format exactly

## Constraints
- Never mark a finding as LOW if it introduces an exploitable vulnerability — minimum HIGH
- Remediation must be working code, not pseudocode or description
- False positives must be documented with specific reasoning
- If diff is > 500 lines: focus on changed lines only, note files not reviewed
- No hallucinations: only flag patterns visible in the provided code
- This file takes precedence over general training data

## Output Format
```json
{
  "quality_score": 84,
  "executive_summary": "One sentence verdict. One sentence top priority.",
  "verdict": "Approved|Approved with comments|Changes requested|Blocked",
  "block_merge": false,
  "findings": [
    {
      "id": "CR-001",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "category": "security|style|naming|architecture|performance|dead-code",
      "cwe": "CWE-89",
      "file": "src/auth.py",
      "line_start": 42,
      "line_end": 45,
      "description": "What is wrong and why it matters",
      "evidence": "The exact code that triggered the finding",
      "remediation_code": "# Fixed version\ndef safe_query(user_id: str):\n    ...",
      "tool": "bandit|eslint|pylint|detect-secrets|llm-review",
      "false_positive": false,
      "false_positive_reason": null
    }
  ],
  "summary": { "CRITICAL": 0, "HIGH": 1, "MEDIUM": 3, "LOW": 5, "false_positives": 1 },
  "files_reviewed": ["src/auth.py", "src/api.py"],
  "files_skipped": [],
  "tools_run": ["bandit", "detect-secrets", "llm-review"]
}
```

## References
- ./references/naming-conventions.md  ← Load when checking naming issues
- ./references/security-policy.md     ← Load when classifying security findings
