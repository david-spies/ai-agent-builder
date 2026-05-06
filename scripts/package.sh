#!/usr/bin/env bash
# =============================================================================
# package.sh — Ai-Agent Builder · Package Builder & Deployment Script
# Assembles, validates, versions, and deploys an agent package.
#
# Usage:
#   ./scripts/package.sh --agent-dir DIR --version VERSION [options]
#
# Options:
#   --agent-dir DIR        Source directory containing SKILL.md etc. (required)
#   --version VERSION      Semantic version for this release e.g. 1.2.0 (required)
#   --env ENV              Target environment: dev|staging|production (default: dev)
#   --canary PCT           Canary percentage for production: 5|25|50|100 (default: 100)
#   --output-dir DIR       Where to write the packaged output (default: ./dist)
#   --skip-validation      Skip validate.sh pre-check (not recommended)
#   --skip-eval            Skip eval runner pre-check (not recommended)
#   --dry-run              Print what would happen without doing it
#   --help                 Show this help
#
# Examples:
#   ./scripts/package.sh --agent-dir . --version 1.1.0
#   ./scripts/package.sh --agent-dir . --version 1.1.0 --env staging
#   ./scripts/package.sh --agent-dir . --version 1.1.0 --env production --canary 5
# =============================================================================

set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────────
AGENT_DIR=""
VERSION=""
ENV="dev"
CANARY=100
OUTPUT_DIR="./dist"
SKIP_VALIDATION=false
SKIP_EVAL=false
DRY_RUN=false

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC}  $1"; }
ok()      { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
err()     { echo -e "${RED}[ERR]${NC}   $1"; }
step()    { echo -e "\n${BOLD}▶ $1${NC}"; }
dryrun()  { echo -e "${YELLOW}[DRY-RUN]${NC} $1"; }

# ── Argument parsing ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --agent-dir)       AGENT_DIR="$2"; shift 2 ;;
    --version)         VERSION="$2"; shift 2 ;;
    --env)             ENV="$2"; shift 2 ;;
    --canary)          CANARY="$2"; shift 2 ;;
    --output-dir)      OUTPUT_DIR="$2"; shift 2 ;;
    --skip-validation) SKIP_VALIDATION=true; shift ;;
    --skip-eval)       SKIP_EVAL=true; shift ;;
    --dry-run)         DRY_RUN=true; shift ;;
    --help)
      head -30 "$0" | grep "^#" | sed 's/^# \{0,2\}//'
      exit 0 ;;
    *) err "Unknown argument: $1"; exit 1 ;;
  esac
done

# ── Validate required args ────────────────────────────────────────────────────
[[ -z "$AGENT_DIR" ]] && { err "--agent-dir is required"; exit 1; }
[[ -z "$VERSION" ]]   && { err "--version is required"; exit 1; }
[[ ! -d "$AGENT_DIR" ]] && { err "Agent directory not found: $AGENT_DIR"; exit 1; }
[[ ! -f "$AGENT_DIR/SKILL.md" ]] && { err "SKILL.md not found in $AGENT_DIR"; exit 1; }

# Validate semver format
if ! echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  err "Version must be semantic: MAJOR.MINOR.PATCH (e.g. 1.2.0)"
  exit 1
fi

# Extract agent name from SKILL.md
AGENT_NAME=$(grep "^name:" "$AGENT_DIR/SKILL.md" | head -1 | sed 's/^name: //' | tr -d '"')
AGENT_SLUG=$(echo "$AGENT_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g')
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
PACKAGE_NAME="${AGENT_SLUG}-v${VERSION}"
PACKAGE_DIR="${OUTPUT_DIR}/${PACKAGE_NAME}"

echo ""
echo -e "${BOLD}════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  Ai-Agent Builder — Package Builder${NC}"
echo -e "  Agent:   ${CYAN}${AGENT_NAME}${NC}"
echo -e "  Version: ${CYAN}${VERSION}${NC}"
echo -e "  Env:     ${CYAN}${ENV}${NC}"
[[ "$ENV" == "production" ]] && echo -e "  Canary:  ${CYAN}${CANARY}%${NC}"
[[ "$DRY_RUN" == "true" ]]   && echo -e "  Mode:    ${YELLOW}DRY RUN${NC}"
echo -e "${BOLD}════════════════════════════════════════════════${NC}"

# ── Step 1: Pre-build validation ─────────────────────────────────────────────
step "Step 1/6 — Pre-build validation"

if [[ "$SKIP_VALIDATION" == "true" ]]; then
  warn "Validation skipped (--skip-validation flag set)"
else
  if [[ "$DRY_RUN" == "true" ]]; then
    dryrun "Would run: bash scripts/validate.sh $AGENT_DIR --strict"
  else
    if bash "$(dirname "$0")/validate.sh" "$AGENT_DIR" --strict; then
      ok "Validation passed"
    else
      err "Validation failed — fix errors before packaging"
      exit 1
    fi
  fi
fi

# ── Step 2: Run eval suite ───────────────────────────────────────────────────
step "Step 2/6 — Evaluation suite"

EVAL_DIR="${AGENT_DIR}/evals/golden-set"
if [[ "$SKIP_EVAL" == "true" ]]; then
  warn "Eval suite skipped (--skip-eval flag set)"
elif [[ ! -d "$EVAL_DIR" ]]; then
  warn "No golden-set directory found at $EVAL_DIR — skipping eval"
elif [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
  warn "ANTHROPIC_API_KEY not set — running eval in dry-run mode"
  if [[ "$DRY_RUN" != "true" ]]; then
    python3 "$(dirname "$0")/eval-runner.py" \
      --golden-set "$EVAL_DIR" \
      --threshold 4.0 \
      --dry-run \
      --output "${OUTPUT_DIR}/eval-results-dry.json" 2>/dev/null || warn "Eval dry-run completed with warnings"
  fi
else
  EVAL_OUTPUT="${OUTPUT_DIR}/eval-results-${VERSION}.json"
  if [[ "$DRY_RUN" == "true" ]]; then
    dryrun "Would run: python3 scripts/eval-runner.py --golden-set $EVAL_DIR --threshold 4.0 --output $EVAL_OUTPUT"
  else
    mkdir -p "$OUTPUT_DIR"
    if python3 "$(dirname "$0")/eval-runner.py" \
        --golden-set "$EVAL_DIR" \
        --threshold 4.0 \
        --output "$EVAL_OUTPUT"; then
      ok "Eval suite passed"
    else
      EXIT_CODE=$?
      if [[ $EXIT_CODE -eq 2 ]]; then
        err "Eval suite: CRITICAL security finding — deployment blocked"
        exit 1
      elif [[ $EXIT_CODE -eq 1 ]]; then
        warn "Eval suite: some scenarios failed — review $EVAL_OUTPUT before proceeding"
        if [[ "$ENV" == "production" ]]; then
          err "Cannot promote to production with eval failures"
          exit 1
        fi
      fi
    fi
  fi
fi

# ── Step 3: Compute file checksums ───────────────────────────────────────────
step "Step 3/6 — File integrity checksums"

MANIFEST_FILE="${AGENT_DIR}/references/versioning.md"

compute_checksums() {
  local dir="$1"
  local checksums=""
  while IFS= read -r -d '' file; do
    local rel="${file#$dir/}"
    local hash
    hash=$(sha256sum "$file" | awk '{print $1}')
    checksums+="  ${rel}: ${hash}\n"
  done < <(find "$dir" -name "*.md" -o -name "*.py" -o -name "*.sh" -o -name "*.json" | sort | tr '\n' '\0')
  echo -e "$checksums"
}

if [[ "$DRY_RUN" == "true" ]]; then
  dryrun "Would compute SHA-256 checksums for all .md, .py, .sh, .json files"
else
  CHECKSUMS=$(compute_checksums "$AGENT_DIR")
  info "Checksums computed for package integrity verification"
fi

# ── Step 4: Assemble package ─────────────────────────────────────────────────
step "Step 4/6 — Assembling package"

if [[ "$DRY_RUN" == "true" ]]; then
  dryrun "Would create: $PACKAGE_DIR"
  dryrun "Would copy: $AGENT_DIR → $PACKAGE_DIR"
  dryrun "Would inject version $VERSION into SKILL.md"
  dryrun "Would write: $PACKAGE_DIR/references/versioning.md"
else
  mkdir -p "$PACKAGE_DIR"

  # Copy all agent files
  rsync -a --exclude='.git' --exclude='dist' --exclude='node_modules' \
    --exclude='__pycache__' --exclude='*.pyc' \
    "$AGENT_DIR/" "$PACKAGE_DIR/"

  # Inject version into SKILL.md
  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i '' "s/^version: .*/version: $VERSION/" "$PACKAGE_DIR/SKILL.md"
  else
    sed -i "s/^version: .*/version: $VERSION/" "$PACKAGE_DIR/SKILL.md"
  fi

  # Write version manifest to versioning.md
  cat >> "$PACKAGE_DIR/references/versioning.md" << EOF

---
## Version Entry — ${VERSION}

\`\`\`yaml
version: "${VERSION}"
packaged_at: "${TIMESTAMP}"
environment: "${ENV}"
packaged_by: "package.sh"
file_checksums:
${CHECKSUMS}
\`\`\`
EOF

  ok "Package assembled at: $PACKAGE_DIR"
  info "Package contents:"
  find "$PACKAGE_DIR" -type f | sort | sed "s|$PACKAGE_DIR/||" | while read -r f; do
    SIZE=$(wc -c < "$PACKAGE_DIR/$f" | tr -d ' ')
    printf "  %-50s %s bytes\n" "$f" "$SIZE"
  done
fi

# ── Step 5: Environment-specific deploy ──────────────────────────────────────
step "Step 5/6 — Environment deployment"

case "$ENV" in
  dev)
    if [[ "$DRY_RUN" == "true" ]]; then
      dryrun "Would deploy to: ~/.claude/skills/${AGENT_SLUG}/ (dev)"
    else
      DEPLOY_PATH="${HOME}/.claude/skills/${AGENT_SLUG}"
      mkdir -p "$DEPLOY_PATH"
      rsync -a "$PACKAGE_DIR/" "$DEPLOY_PATH/"
      ok "Deployed to local Claude Code skills: $DEPLOY_PATH"
    fi
    ;;
  staging)
    if [[ "$DRY_RUN" == "true" ]]; then
      dryrun "Would deploy to staging — check STAGING_DEPLOY_PATH env var"
    elif [[ -n "${STAGING_DEPLOY_PATH:-}" ]]; then
      rsync -a "$PACKAGE_DIR/" "$STAGING_DEPLOY_PATH/${AGENT_SLUG}/"
      ok "Deployed to staging: $STAGING_DEPLOY_PATH/${AGENT_SLUG}/"
    else
      warn "STAGING_DEPLOY_PATH not set — package is in $PACKAGE_DIR (deploy manually)"
    fi
    ;;
  production)
    if [[ "$CANARY" -lt 100 ]]; then
      warn "Production canary deployment: ${CANARY}% of traffic"
      if [[ "$DRY_RUN" == "true" ]]; then
        dryrun "Would configure load balancer for ${CANARY}% canary"
        dryrun "Would set monitoring alert window: 48 hours"
      else
        warn "MANUAL STEP REQUIRED: Configure ${CANARY}% canary in your load balancer"
        warn "Monitoring window: 48 hours — watch error rate, latency, guardrail block rate"
        info "Rollback command: ./scripts/package.sh --agent-dir . --version PREVIOUS_VERSION --env production"
      fi
    else
      if [[ "$DRY_RUN" == "true" ]]; then
        dryrun "Would promote to 100% production traffic"
      else
        warn "PRODUCTION DEPLOYMENT: Full 100% traffic promotion"
        info "Package ready at: $PACKAGE_DIR"
        info "Deploy to your production environment and verify health checks"
      fi
    fi
    ;;
  *)
    err "Unknown environment: $ENV (valid: dev|staging|production)"
    exit 1
    ;;
esac

# ── Step 6: Post-package summary ─────────────────────────────────────────────
step "Step 6/6 — Summary"

FILE_COUNT=$(find "$PACKAGE_DIR" -type f 2>/dev/null | wc -l | tr -d ' ')
TOTAL_SIZE=$(du -sh "$PACKAGE_DIR" 2>/dev/null | awk '{print $1}')

echo ""
echo -e "${BOLD}════════════════════════════════════════════════${NC}"
if [[ "$DRY_RUN" == "true" ]]; then
  echo -e "  ${YELLOW}DRY RUN COMPLETE — no files modified${NC}"
else
  echo -e "  ${GREEN}✓ Package built successfully${NC}"
  echo ""
  echo -e "  Agent:      ${CYAN}${AGENT_NAME}${NC}"
  echo -e "  Version:    ${CYAN}${VERSION}${NC}"
  echo -e "  Package:    ${CYAN}${PACKAGE_DIR}${NC}"
  echo -e "  Files:      ${CYAN}${FILE_COUNT}${NC}"
  echo -e "  Size:       ${CYAN}${TOTAL_SIZE}${NC}"
  echo -e "  Timestamp:  ${CYAN}${TIMESTAMP}${NC}"
  if [[ "$ENV" == "production" && "$CANARY" -lt 100 ]]; then
    echo ""
    echo -e "  ${YELLOW}⚠ Canary at ${CANARY}% — monitor for 48 hours before full rollout${NC}"
    echo -e "  ${YELLOW}  Rollback: ./scripts/package.sh --agent-dir . --version PREV --env production${NC}"
  fi
fi
echo -e "${BOLD}════════════════════════════════════════════════${NC}"
echo ""
