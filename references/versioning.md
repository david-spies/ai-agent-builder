---
name: versioning
version: 1.0.0
description: Version control manifest, semantic versioning rules, changelog templates, rollback procedures, and deployment promotion workflows for AI agents. Load when releasing a new agent version, rolling back a bad deploy, or auditing what changed between agent versions.
load: on-demand
---

# Versioning — Agent Version Control
# Ai-Agent Builder · References

version: 1.0.0
versioning_scheme: semver
generated: 2025-05-04

---

## Semantic Versioning Rules

```
MAJOR.MINOR.PATCH

MAJOR — Breaking changes
  - Generated file schema changes that break existing parsers
  - Permission scope changes (reduction or expansion)
  - Guardrail rule removals
  - SKILL.md ## Instructions complete rewrites
  - Agent template changes

MINOR — Backwards-compatible additions
  - New skills added to .agents/skills/
  - New feature flags added (defaulting to previous behavior)
  - New output fields added to JSON schema
  - New eval scenarios added to golden set
  - New quick-fill templates

PATCH — Bug fixes and non-breaking changes
  - Typo fixes, documentation updates
  - description: field improvements (no behavior change)
  - Eval threshold adjustments (±0.1)
  - UI improvements in builder
  - Performance optimizations
```

---

## Version Manifest Format

```yaml
# versioning.md — Version Manifest
agent_name: "{name}"
current_version: "1.0.0"
minimum_compatible_version: "1.0.0"
generated: "2025-05-04"

files:
  SKILL.md:
    version: "1.0.0"
    sha256: "{hash}"
    last_modified: "2025-05-04"
    breaking_changes_since: []

  AGENTS.md:
    version: "1.0.0"
    sha256: "{hash}"
    last_modified: "2025-05-04"

  references/guardrails.md:
    version: "1.0.0"
    sha256: "{hash}"
    last_modified: "2025-05-04"
    critical: true   # changes to this file require MAJOR bump

  references/llm-judge.md:
    version: "1.0.0"
    sha256: "{hash}"
    last_modified: "2025-05-04"

  references/audit-trails.md:
    version: "1.0.0"
    sha256: "{hash}"
    last_modified: "2025-05-04"
    critical: true

  references/governance.md:
    version: "1.0.0"
    sha256: "{hash}"
    last_modified: "2025-05-04"

  references/permissions.md:
    version: "1.0.0"
    sha256: "{hash}"
    last_modified: "2025-05-04"
    critical: true   # permission changes always require review

deployment_history:
  - version: "1.0.0"
    deployed: "2025-05-04T00:00:00Z"
    deployed_by: "ai-agent-builder"
    environment: "production"
    eval_score: null
    status: "active"
```

---

## Deployment Promotion Workflow

```
┌──────────┐     eval + lint      ┌─────────┐    smoke test    ┌────────────┐    canary    ┌────────────┐
│   dev    │ ─────────────────▶  │ staging │ ──────────────▶  │ production │ ──────────▶  │ 100% prod  │
│          │                     │         │                   │  (5% canary)│   (48h watch)│            │
└──────────┘                     └─────────┘                   └────────────┘              └────────────┘
     │                                │                               │
     │ blocked if:                    │ blocked if:                   │ rollback if:
     │ - lint fails                   │ - eval score drops            │ - error rate > 1%
     │ - unit tests fail              │ - red team fails              │ - latency > 2× baseline
     │ - security score < 4           │ - smoke tests fail            │ - guardrail rate spikes
```

### Promotion Commands

```bash
# Promote dev → staging
./scripts/package.sh --env staging --version 1.1.0

# Run full eval before staging promotion
./scripts/eval-runner.sh --env staging --golden-set evals/golden-set/ --threshold 4.0

# Promote staging → production (canary 5%)
./scripts/package.sh --env production --canary 5 --version 1.1.0

# Full production rollout
./scripts/package.sh --env production --canary 100 --version 1.1.0
```

---

## Rollback Procedures

### Automatic Rollback Triggers

```yaml
automatic_rollback_triggers:
  - metric: error_rate
    threshold: "1%"
    window: "5 minutes"

  - metric: guardrail_block_rate
    threshold: "10x baseline"
    window: "5 minutes"

  - metric: p99_latency_ms
    threshold: "2x baseline"
    window: "10 minutes"

  - metric: eval_score_correctness
    threshold: "drop > 0.5 from baseline"
    window: "realtime"

  - event: security_score_critical
    threshold: "any security score = 1"
    window: "immediate"
```

### Manual Rollback

```bash
# Immediate rollback to previous version
./scripts/rollback.sh --agent {agent-name} --target-version 1.0.0

# What rollback does:
# 1. Restore previous SKILL.md, AGENTS.md, and all reference files from git tag
# 2. Redirect traffic to previous version (blue/green swap)
# 3. Write audit event: { event_type: "version_rollback", ... }
# 4. Notify Slack: #incident-{agent-name} with rollback reason
# 5. Disable canary deployment of rolled-back version
# 6. Require post-mortem before re-deploying same version
```

---

## Changelog Template

```markdown
## [VERSION] — YYYY-MM-DD

### ⚠️ Breaking Changes (MAJOR)
- [Description of breaking change and migration path]

### ✨ Added (MINOR)
- [New feature or capability]

### 🔒 Security
- [Security improvement — always document separately]

### 🐛 Fixed (PATCH)
- [Bug fix description]

### 📝 Documentation
- [Documentation changes]

### 🔧 Internal
- [Refactoring, performance, or dev tooling changes]

### Migration Guide (if MAJOR)
Describe step-by-step how to migrate from previous version.
```

---

## File Integrity Verification

```python
import hashlib
import json
from pathlib import Path

def generate_version_manifest(agent_dir: str, version: str) -> dict:
    """Generate SHA-256 checksums for all agent files."""
    critical_files = ["guardrails.md", "audit-trails.md", "permissions.md"]
    manifest = {
        "agent_name": Path(agent_dir).name,
        "version": version,
        "generated": datetime.utcnow().isoformat() + "Z",
        "files": {}
    }

    for path in Path(agent_dir).rglob("*.md"):
        relative = str(path.relative_to(agent_dir))
        content = path.read_bytes()
        sha256 = hashlib.sha256(content).hexdigest()
        manifest["files"][relative] = {
            "sha256": sha256,
            "size_bytes": len(content),
            "critical": any(cf in relative for cf in critical_files),
            "last_modified": datetime.utcfromtimestamp(
                path.stat().st_mtime
            ).isoformat() + "Z"
        }

    return manifest


def verify_integrity(agent_dir: str, manifest: dict) -> list[str]:
    """Verify current files match manifest checksums. Returns list of violations."""
    violations = []
    for relative_path, meta in manifest["files"].items():
        full_path = Path(agent_dir) / relative_path
        if not full_path.exists():
            violations.append(f"MISSING: {relative_path}")
            continue
        actual_sha256 = hashlib.sha256(full_path.read_bytes()).hexdigest()
        if actual_sha256 != meta["sha256"]:
            severity = "CRITICAL" if meta.get("critical") else "WARNING"
            violations.append(
                f"{severity}: {relative_path} — checksum mismatch. "
                f"Expected {meta['sha256'][:8]}..., got {actual_sha256[:8]}..."
            )
    return violations
```
