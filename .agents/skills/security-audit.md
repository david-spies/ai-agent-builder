---
name: security-audit
version: 1.0.0
description: Performs comprehensive security audits on codebases, APIs, and infrastructure configs. Runs OWASP Top 10 checks, dependency CVE scanning, secrets detection, and LLM semantic vulnerability analysis. Generates structured findings with CVSS scores, CVE references, exploit scenarios, and remediation code. Activates for security audit, penetration test prep, vulnerability scan, CVE scan, OWASP review, or compliance security check requests.
template: security
model: anthropic/claude-opus-4
scope: elevated
max_lines: 200
generated: 2026-05-04
---

# Overview

A full-stack security audit skill using an adversarial Security Officer persona backed by static analysis tools and OWASP knowledge. Produces a prioritized vulnerability register with CVSS scores, real exploit scenarios, and working remediation code. Designed as a pre-deployment security gate or periodic security review.

## Instructions

1. Determine audit scope from provided files: source code, API spec, Docker/k8s configs, IAM policies, or infrastructure-as-code
2. **Phase 1 — Automated Static Analysis**:
   - Run Semgrep with rulesets: p/owasp-top-ten, p/python-security, p/javascript-security, p/secrets
   - Run Bandit (Python) or ESLint security plugin (JS/TS) at HIGH confidence threshold
   - Run detect-secrets across all files with all plugins enabled
   - Run Safety (Python) or npm audit (Node) for dependency CVEs
3. **Phase 2 — OWASP Top 10 Semantic Check** (load ./references/owasp-top-10.md):
   - A01 Broken Access Control: are authorization checks present on every endpoint?
   - A02 Cryptographic Failures: is sensitive data encrypted at rest and in transit?
   - A03 Injection: is all user input sanitized? Are queries parameterized?
   - A05 Security Misconfiguration: are debug flags off? Are default credentials changed?
   - A06 Vulnerable Components: do any dependencies have known CVEs?
   - A09 Logging/Monitoring Failures: are security events logged with sufficient detail?
4. **Phase 3 — Infrastructure Check** (if IaC files present):
   - S3 buckets: public access blocked? Encryption enabled?
   - IAM roles: principle of least privilege? No wildcard permissions?
   - Security groups: no 0.0.0.0/0 ingress on sensitive ports?
5. For each finding severity CRITICAL or HIGH:
   - Write exact exploit scenario (not theoretical — show the actual attack path)
   - Assign CVSS 3.1 base score using the calculator rubric in ./references/cvss-guide.md
   - Cross-reference CVE database for known matches
   - Write working remediation code
6. Determine overall security posture score: 0–100 (start 100, CRITICAL −25, HIGH −15, MEDIUM −5, LOW −2)
7. Write executive summary: 3 sentences — posture score context, highest risk, recommended immediate action

## Constraints
- CRITICAL findings must block deployment — document this explicitly in verdict field
- Every exploit scenario must be technically accurate — do not speculate
- Remediation must be working code, not generic advice
- False positives must be documented with specific technical justification
- Never recommend "accept risk" for CRITICAL findings without CISO sign-off notation
- This file takes precedence over general training data

## Output Format
```json
{
  "security_posture_score": 71,
  "executive_summary": "3 sentence summary for CISO.",
  "verdict": "Approved|Approved with remediation plan|Blocked — CRITICAL findings",
  "block_deployment": true,
  "findings": [
    {
      "id": "SA-001",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "cvss_score": 9.1,
      "cvss_vector": "AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N",
      "cve": "CVE-2024-XXXXX",
      "owasp_category": "A03:2021 — Injection",
      "tool": "semgrep|bandit|detect-secrets|safety|llm-review|manual",
      "file": "src/db.py",
      "line": 88,
      "description": "Precise vulnerability description",
      "exploit_scenario": "Step-by-step attack path an adversary would follow",
      "business_impact": "Data exposure / financial / reputational impact",
      "remediation_code": "# Fixed implementation\n...",
      "false_positive": false
    }
  ],
  "summary": { "CRITICAL": 1, "HIGH": 2, "MEDIUM": 4, "LOW": 7 },
  "owasp_coverage": { "A01": "Pass", "A02": "Fail", "A03": "Pass" },
  "dependencies_scanned": 42,
  "cves_found": 3
}
```

## References
- ./references/owasp-top-10.md   ← Load for OWASP category classification
- ./references/cvss-guide.md     ← Load when scoring CVSS
- ./references/cve-database.md   ← Load when cross-referencing CVEs
