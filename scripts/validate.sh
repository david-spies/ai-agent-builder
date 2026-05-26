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

# ── 7. Logic component validation ────────────────────────────────────────────
log_info "Validating logic components..."

LOGIC_DIR="${AGENT_DIR}/logic"

if [ -d "$LOGIC_DIR" ]; then
  log_ok "logic/ directory found"

  # Check each enabled component has the right component_type
  declare -A EXPECTED_TYPES=(
    ["ROUTER.md"]="logic-gate"
    ["SEQUENCE.md"]="iterator"
    ["GATE.md"]="hitl-checkpoint"
    ["DATA_MAP.md"]="data-mapper"
    ["ERROR_POLICY.md"]="error-handler"
  )

  for file in "${!EXPECTED_TYPES[@]}"; do
    filepath="${LOGIC_DIR}/${file}"
    expected="${EXPECTED_TYPES[$file]}"
    if [ -f "$filepath" ]; then
      if grep -q "component_type: ${expected}" "$filepath"; then
        log_ok "Logic component valid: ${file} (${expected})"
      else
        log_warn "Logic component ${file} missing component_type: ${expected}"
      fi
    fi
  done

  # Check routing-manifest.json is valid JSON
  MANIFEST="${LOGIC_DIR}/routing-manifest.json"
  if [ -f "$MANIFEST" ]; then
    if python3 -c "import json,sys; json.load(open('${MANIFEST}'))" 2>/dev/null; then
      log_ok "routing-manifest.json is valid JSON"
    else
      log_err "routing-manifest.json is invalid JSON"
    fi

    # Validate every target_skill in the manifest exists in .agents/skills/
    SKILLS_DIR="${AGENT_DIR}/.agents/skills"
    if [ -d "$SKILLS_DIR" ]; then
      python3 -c "
import json, os, sys
manifest = json.load(open('${MANIFEST}'))
skills_dir = '${SKILLS_DIR}'
available = set(os.listdir(skills_dir))
errors = []
for router in manifest.get('routers', []):
    for rule in router.get('rules', []):
        target = rule.get('target_skill','')
        if target and target not in available:
            errors.append(f'ROUTER rule target not found in .agents/skills/: {target}')
if errors:
    for e in errors: print('ERROR:', e)
    sys.exit(1)
else:
    print('OK: all ROUTER target skills exist')
" && log_ok "All ROUTER target skills verified in .agents/skills/" \
  || log_err "ROUTER.md references skills that do not exist — update .agents/skills/ or routing rules"
    else
      log_warn ".agents/skills/ directory not found — cannot validate ROUTER targets"
    fi
  fi

  # Warn if GATE.md exists without HMAC mention
  if [ -f "${LOGIC_DIR}/GATE.md" ]; then
    if grep -qi "hmac\|signature" "${LOGIC_DIR}/GATE.md"; then
      log_ok "GATE.md references HMAC signature verification"
    else
      log_warn "GATE.md does not mention HMAC — callback URL approvals may be insecure"
    fi
  fi

else
  log_info "No logic/ directory found — skipping logic component checks"
  log_info "To add logic components, run the builder and enable them in Feature Flags"
fi

# ── 8. on_fail frontmatter validation ────────────────────────────────────────
log_info "Validating on_fail frontmatter keys..."

SKILLS_DIR="${AGENT_DIR}/.agents/skills"
RESERVED_TARGETS="reasoning-only.md hitl-gate general-assistant"

validate_on_fail_target() {
  local target="$1"
  local field="$2"
  local skill_file="$3"

  # Empty = not set, OK
  [ -z "$target" ] && return 0

  # Check reserved values
  if echo "$RESERVED_TARGETS" | grep -qw "$target"; then
    return 0
  fi

  # Check skill exists in .agents/skills/
  if [ -d "$SKILLS_DIR" ] && [ -f "${SKILLS_DIR}/${target}" ]; then
    return 0
  fi

  log_warn "Skill file '${target}' referenced in ${field} of ${skill_file} not found in .agents/skills/"
  return 1
}

if [ -d "$SKILLS_DIR" ]; then
  for skill_file in "${SKILLS_DIR}"/*.md; do
    [ -f "$skill_file" ] || continue
    skill_name=$(basename "$skill_file")

    # Extract frontmatter values
    on_fail=$(grep -m1 "^on_fail:" "$skill_file" 2>/dev/null | sed 's/^on_fail: *//' | tr -d '"')
    on_empty=$(grep -m1 "^on_empty_result:" "$skill_file" 2>/dev/null | sed 's/^on_empty_result: *//' | tr -d '"')
    on_timeout=$(grep -m1 "^on_timeout:" "$skill_file" 2>/dev/null | sed 's/^on_timeout: *//' | tr -d '"')
    retry_count=$(grep -m1 "^retry_count:" "$skill_file" 2>/dev/null | sed 's/^retry_count: *//' | tr -d '"')

    if [ -z "$on_fail" ]; then
      log_info "  ${skill_name}: no on_fail set — uses ERROR_POLICY.md global"
      continue
    fi

    # Validate on_fail target
    validate_on_fail_target "$on_fail" "on_fail" "$skill_name" \
      && log_ok "  ${skill_name}: on_fail='${on_fail}' ✓" \
      || ERRORS=$((ERRORS+1))

    # Validate on_empty_result target
    [ -n "$on_empty" ] && {
      validate_on_fail_target "$on_empty" "on_empty_result" "$skill_name" \
        && log_ok "  ${skill_name}: on_empty_result='${on_empty}' ✓" \
        || ERRORS=$((ERRORS+1))
    }

    # Validate on_timeout target
    [ -n "$on_timeout" ] && {
      validate_on_fail_target "$on_timeout" "on_timeout" "$skill_name" \
        && log_ok "  ${skill_name}: on_timeout='${on_timeout}' ✓" \
        || ERRORS=$((ERRORS+1))
    }

    # Validate retry_count is 0-10
    if [ -n "$retry_count" ]; then
      if echo "$retry_count" | grep -qE '^[0-9]+$' && [ "$retry_count" -ge 0 ] && [ "$retry_count" -le 10 ]; then
        log_ok "  ${skill_name}: retry_count=${retry_count} ✓"
      else
        log_err "  ${skill_name}: retry_count='${retry_count}' must be integer 0-10"
        ERRORS=$((ERRORS+1))
      fi
    fi

    # Warn if on_fail=hitl-gate but GATE.md not in package
    if [ "$on_fail" = "hitl-gate" ] || [ "$on_empty" = "hitl-gate" ] || [ "$on_timeout" = "hitl-gate" ]; then
      if [ ! -f "${AGENT_DIR}/logic/GATE.md" ]; then
        log_warn "  ${skill_name}: references hitl-gate but logic/GATE.md not found in package"
      fi
    fi
  done
else
  log_info "No .agents/skills/ directory — skipping on_fail validation"
fi
