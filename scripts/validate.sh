#!/usr/bin/env bash
# =============================================================================
# validate.sh — Pre-build validation for Ai-Agent Builder packages
# Usage: ./scripts/validate.sh [--agent-dir DIR] [--strict]
# =============================================================================

set -euo pipefail

AGENT_DIR="${1:-.}"
STRICT="${2:-false}"
ERRORS=0
WARNINGS=0

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info()  { echo -e "${CYAN}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[PASS]${NC}  $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; WARNINGS=$((WARNINGS+1)); }
log_err()   { echo -e "${RED}[FAIL]${NC}  $1"; ERRORS=$((ERRORS+1)); }

echo ""
echo "════════════════════════════════════════════"
echo "  Ai-Agent Builder — Package Validator"
echo "  Target: ${AGENT_DIR}"
echo "════════════════════════════════════════════"
echo ""

# ── 1. Required files exist ──────────────────────────────────────────────────
log_info "Checking required files..."

REQUIRED_FILES=(
  "SKILL.md"
  "AGENTS.md"
  "MEMORIES.md"
  "references/guardrails.md"
  "references/llm-judge.md"
  "references/audit-trails.md"
  "references/governance.md"
  "references/permissions.md"
  "references/versioning.md"
)

for f in "${REQUIRED_FILES[@]}"; do
  if [ -f "${AGENT_DIR}/${f}" ]; then
    log_ok "Found: ${f}"
  else
    log_err "Missing required file: ${f}"
  fi
done

# ── 2. SKILL.md structure ────────────────────────────────────────────────────
log_info "Validating SKILL.md structure..."
SKILL="${AGENT_DIR}/SKILL.md"

if [ -f "$SKILL" ]; then
  # Check YAML frontmatter
  if grep -q "^---$" "$SKILL"; then
    log_ok "SKILL.md has YAML frontmatter"
  else
    log_err "SKILL.md missing YAML frontmatter (---)"
  fi

  # Check required frontmatter fields
  for field in "name:" "version:" "description:" "template:"; do
    if grep -q "^${field}" "$SKILL"; then
      log_ok "Frontmatter has: ${field}"
    else
      log_err "SKILL.md missing frontmatter field: ${field}"
    fi
  done

  # Check required sections
  for section in "# Overview" "## Instructions" "## Constraints" "## Output Format" "## References"; do
    if grep -q "^${section}" "$SKILL"; then
      log_ok "Section present: ${section}"
    else
      log_warn "SKILL.md missing section: ${section}"
    fi
  done

  # Check line count
  LINES=$(wc -l < "$SKILL")
  if [ "$LINES" -le 200 ]; then
    log_ok "SKILL.md line count: ${LINES}/200"
  else
    log_err "SKILL.md exceeds 200 lines: ${LINES} lines (move content to ./references/)"
  fi

  # Check for hardcoded secrets patterns
  if grep -qE "(AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9_]{36}|-----BEGIN.*PRIVATE KEY)" "$SKILL"; then
    log_err "SKILL.md contains potential hardcoded credentials!"
  else
    log_ok "No hardcoded credentials detected in SKILL.md"
  fi

  # Check description length
  DESC=$(grep "^description:" "$SKILL" | head -1 | sed 's/^description: //')
  DESC_LEN=${#DESC}
  if [ "$DESC_LEN" -ge 20 ] && [ "$DESC_LEN" -le 300 ]; then
    log_ok "description: length OK (${DESC_LEN} chars)"
  elif [ "$DESC_LEN" -lt 20 ]; then
    log_warn "description: too short (${DESC_LEN} chars) — may not trigger reliably"
  else
    log_warn "description: too long (${DESC_LEN} chars) — may be truncated by discovery prompt"
  fi
fi

# ── 3. Guardrails completeness ───────────────────────────────────────────────
log_info "Validating guardrails configuration..."
GUARD="${AGENT_DIR}/references/guardrails.md"

if [ -f "$GUARD" ]; then
  for check in \
    "Input Guardrails" \
    "Execution Guardrails" \
    "Output Guardrails" \
    "Prompt Injection" \
    "PII" \
    "detect-secrets" \
    "HITL" \
    "Cost Controls"; do
    if grep -qi "$check" "$GUARD"; then
      log_ok "Guardrails covers: ${check}"
    else
      log_err "Guardrails missing: ${check}"
    fi
  done
fi

# ── 4. Permissions least-privilege check ─────────────────────────────────────
log_info "Checking permissions for least-privilege..."
PERMS="${AGENT_DIR}/references/permissions.md"

if [ -f "$PERMS" ]; then
  if grep -q "default_scope: read_only" "$PERMS"; then
    log_ok "Default scope is read_only (least privilege)"
  elif grep -q "scope: admin" "$PERMS"; then
    log_err "Admin scope detected — requires HITL and Security Officer sign-off"
  else
    log_warn "Could not determine default scope — review permissions.md manually"
  fi
fi

# ── 5. No placeholder values left ───────────────────────────────────────────
log_info "Checking for unfilled placeholders..."
PLACEHOLDER_PATTERN="\{REQUIRED:"
PLACEHOLDER_COUNT=$(grep -r "$PLACEHOLDER_PATTERN" "${AGENT_DIR}" --include="*.md" | wc -l | tr -d ' ')

if [ "$PLACEHOLDER_COUNT" -eq 0 ]; then
  log_ok "No unfilled placeholders found"
else
  log_warn "${PLACEHOLDER_COUNT} unfilled placeholder(s) found — run 'grep -r \"{REQUIRED:\" .' to list them"
fi

# ── 6. Summary ───────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════"
if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
  echo -e "${GREEN}  ✓ All checks passed — ready to build${NC}"
elif [ "$ERRORS" -eq 0 ]; then
  echo -e "${YELLOW}  ⚠ ${WARNINGS} warning(s) — review before building${NC}"
else
  echo -e "${RED}  ✗ ${ERRORS} error(s), ${WARNINGS} warning(s) — fix errors before building${NC}"
fi
echo "════════════════════════════════════════════"
echo ""

# Exit with error if strict mode and any issues, or if any errors
if [ "$STRICT" = "--strict" ] && [ "$WARNINGS" -gt 0 ]; then
  exit 1
fi

[ "$ERRORS" -eq 0 ] || exit 1
